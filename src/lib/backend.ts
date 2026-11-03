import { createAuthClient } from '@neon/auth'
import { neon } from '@neondatabase/serverless'
import { DEFAULT_SETTINGS, type Product, type StoreSettings } from './types'

/**
 * Capa de datos de la tienda conectada a Neon (Lakebase Postgres + Managed Better Auth).
 * - Con VITE_DATABASE_URL y VITE_NEON_AUTH_URL: productos, configuración, fotos y login real en Neon.
 * - Sin ellas: "modo demo" local en el navegador.
 */
export interface Backend {
  mode: 'neon' | 'demo'
  loadProducts(): Promise<Product[]>
  loadSettings(): Promise<StoreSettings>
  saveProduct(p: Product): Promise<void>
  saveProducts(list: Product[]): Promise<void>
  deleteProduct(id: string): Promise<void>
  saveSettings(s: StoreSettings): Promise<void>
  uploadImage(file: Blob, name: string): Promise<string>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  isAdmin(): Promise<boolean>
}

export function mergeSettings(data: Partial<StoreSettings> | null | undefined): StoreSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(data || {}),
    plans: data?.plans?.length ? data.plans : DEFAULT_SETTINGS.plans,
    address: data?.address || DEFAULT_SETTINGS.address,
    city: data?.address ? data.city || '' : DEFAULT_SETTINGS.city,
    hours: data?.hours || DEFAULT_SETTINGS.hours,
    instagram: data?.instagram || DEFAULT_SETTINGS.instagram,
    facebook: data?.facebook || DEFAULT_SETTINGS.facebook,
    whatsapp: data?.whatsapp || DEFAULT_SETTINGS.whatsapp,
    email: data?.email || DEFAULT_SETTINGS.email,
  }
}

const PRODUCT_DEFAULTS: Omit<Product, 'id'> = {
  code: '', name: '', description: '', category: 'otros', subcategory: null, brand: null, size: null,
  measure: null, material: null, kind: null, model: null, colors: [], price_list: null, discount_pct: 0,
  available: true, featured: false, images: [], sort: 0,
}

export function normalizeProduct(p: Partial<Product> & { id: string }): Product {
  return {
    ...PRODUCT_DEFAULTS,
    ...p,
    price_list: p.price_list == null ? null : Number(p.price_list),
    discount_pct: Number(p.discount_pct || 0),
    colors: p.colors || [],
    images: p.images || [],
  }
}

export async function loadSeedProducts(): Promise<Product[]> {
  const raw = (await import('../data/seed.json')).default as Product[]
  return raw.map(normalizeProduct)
}

function blobToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// ------------------------------------------------------------------ Neon (Lakebase Postgres + Managed Better Auth)

const NEON_TOKEN_KEY = 'perez-neon-session-token'

function neonBackend(dbUrl: string, authUrl: string): Backend {
  const sql = neon(dbUrl)
  const authClient = createAuthClient(authUrl)

  return {
    mode: 'neon',
    async loadProducts() {
      const rows = await sql`SELECT * FROM public.products ORDER BY sort ASC, name ASC`
      return (rows as (Partial<Product> & { id: string })[]).map(normalizeProduct)
    },
    async loadSettings() {
      const rows = await sql`SELECT data FROM public.settings WHERE id = 1 LIMIT 1`
      return mergeSettings(rows[0]?.data as Partial<StoreSettings> | undefined)
    },
    async saveProduct(p) {
      await sql`
        INSERT INTO public.products (
          id, code, name, description, category, subcategory, brand, size, measure,
          material, kind, model, colors, price_list, discount_pct, available, featured, images, sort, updated_at
        ) VALUES (
          ${p.id}, ${p.code}, ${p.name}, ${p.description}, ${p.category},
          ${p.subcategory}, ${p.brand}, ${p.size}, ${p.measure},
          ${p.material}, ${p.kind}, ${p.model}, ${p.colors},
          ${p.price_list}, ${p.discount_pct}, ${p.available},
          ${p.featured}, ${p.images}, ${p.sort}, now()
        )
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          subcategory = EXCLUDED.subcategory,
          brand = EXCLUDED.brand,
          size = EXCLUDED.size,
          measure = EXCLUDED.measure,
          material = EXCLUDED.material,
          kind = EXCLUDED.kind,
          model = EXCLUDED.model,
          colors = EXCLUDED.colors,
          price_list = EXCLUDED.price_list,
          discount_pct = EXCLUDED.discount_pct,
          available = EXCLUDED.available,
          featured = EXCLUDED.featured,
          images = EXCLUDED.images,
          sort = EXCLUDED.sort,
          updated_at = now()
      `
    },
    async saveProducts(list) {
      const chunkSize = 25
      for (let i = 0; i < list.length; i += chunkSize) {
        const chunk = list.slice(i, i + chunkSize)
        await Promise.all(
          chunk.map((p) => this.saveProduct(p))
        )
      }
    },
    async deleteProduct(id) {
      await sql`DELETE FROM public.products WHERE id = ${id}`
    },
    async saveSettings(s) {
      await sql`
        INSERT INTO public.settings (id, data)
        VALUES (1, ${JSON.stringify(s)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
      `
    },
    async uploadImage(file) {
      // Las imágenes ya vienen comprimidas en WebP desde compressImage() y se persisten en Neon Postgres
      return blobToDataUrl(file)
    },
    async signIn(email, password) {
      let res: { data?: { user?: { id: string }; token?: string } | null; error?: { message?: string } | null }
      try {
        res = await authClient.signIn.email({ email, password })
      } catch {
        throw new Error('E-mail o contraseña incorrectos')
      }
      if (res.error || !res.data?.user?.id) {
        throw new Error('E-mail o contraseña incorrectos')
      }
      const uid = res.data.user.id
      const admins = await sql`SELECT user_id FROM public.admins WHERE user_id = ${uid} LIMIT 1`
      if (!admins.length) {
        await this.signOut()
        throw new Error('Este usuario no tiene permisos de administrador')
      }
      if (res.data.token) {
        try {
          localStorage.setItem(NEON_TOKEN_KEY, res.data.token)
        } catch {
          // ignore storage errors
        }
      }
    },
    async signOut() {
      const token = (() => {
        try {
          return localStorage.getItem(NEON_TOKEN_KEY)
        } catch {
          return null
        }
      })()
      try {
        await authClient.signOut()
      } catch {
        // ignore network/cookie errors on signOut
      }
      if (token) {
        try {
          await sql`DELETE FROM neon_auth.session WHERE token = ${token}`
        } catch {
          // ignore
        }
      }
      try {
        localStorage.removeItem(NEON_TOKEN_KEY)
      } catch {
        // ignore
      }
    },
    async isAdmin() {
      // 1. Intentar obtener sesión desde Neon Auth client
      try {
        const { data } = await authClient.getSession()
        const uid = data?.user?.id
        if (uid) {
          const admins = await sql`SELECT user_id FROM public.admins WHERE user_id = ${uid} LIMIT 1`
          if (admins.length > 0) return true
        }
      } catch {
        // fallback al token persistido si el navegador bloquea cookies cross-origin
      }

      // 2. Fallback: verificar token de sesión de Better Auth en neon_auth.session
      let token: string | null = null
      try {
        token = localStorage.getItem(NEON_TOKEN_KEY)
      } catch {
        return false
      }
      if (!token) return false

      try {
        const valid = await sql`
          SELECT a.user_id
          FROM neon_auth.session s
          JOIN public.admins a ON a.user_id = s."userId"::text
          WHERE s.token = ${token} AND s."expiresAt" > now()
          LIMIT 1
        `
        return valid.length > 0
      } catch {
        return false
      }
    },
  }
}

// ------------------------------------------------------------------ Modo demo

const LS_PRODUCTS = 'perez-demo-products'
const LS_SETTINGS = 'perez-demo-settings'
const SS_ADMIN = 'perez-demo-admin'
export const DEMO_PASSWORD = 'demo'

function readLS<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    throw new Error('No hay más espacio en el navegador para el modo demo. Probá con fotos más livianas.')
  }
}

function demoBackend(): Backend {
  const load = async () => readLS<Product[]>(LS_PRODUCTS) || loadSeedProducts()
  return {
    mode: 'demo',
    async loadProducts() {
      return load()
    },
    async loadSettings() {
      return mergeSettings(readLS<StoreSettings>(LS_SETTINGS))
    },
    async saveProduct(p) {
      const list = await load()
      const i = list.findIndex((x) => x.id === p.id)
      if (i >= 0) list[i] = p
      else list.push(p)
      writeLS(LS_PRODUCTS, list)
    },
    async saveProducts(updated) {
      const map = new Map(updated.map((p) => [p.id, p]))
      writeLS(LS_PRODUCTS, (await load()).map((p) => map.get(p.id) || p))
    },
    async deleteProduct(id) {
      writeLS(LS_PRODUCTS, (await load()).filter((p) => p.id !== id))
    },
    async saveSettings(s) {
      writeLS(LS_SETTINGS, s)
    },
    async uploadImage(file) {
      return blobToDataUrl(file)
    },
    async signIn(_email, password) {
      if (password !== DEMO_PASSWORD) throw new Error('Contraseña incorrecta')
      sessionStorage.setItem(SS_ADMIN, '1')
    },
    async signOut() {
      sessionStorage.removeItem(SS_ADMIN)
    },
    async isAdmin() {
      return sessionStorage.getItem(SS_ADMIN) === '1'
    },
  }
}

const rawDbUrl = import.meta.env.VITE_DATABASE_URL as string | undefined
const cleanDbUrl = rawDbUrl ? rawDbUrl.replace(/[?&]channel_binding=[^&]+/g, '') : undefined
const authUrl = import.meta.env.VITE_NEON_AUTH_URL as string | undefined

const isValidNeonConfig =
  !!cleanDbUrl &&
  !!authUrl &&
  cleanDbUrl.startsWith('postgresql://') &&
  !cleanDbUrl.includes('ep-xxxx') &&
  authUrl.startsWith('https://')

export const backend: Backend = isValidNeonConfig ? neonBackend(cleanDbUrl, authUrl) : demoBackend()
