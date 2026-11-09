import { createAuthClient } from '@neon/auth'
import { DEFAULT_SETTINGS, type Product, type StoreSettings } from './types'

/**
 * Capa de datos de la tienda conectada a Neon (Postgres + Neon Auth) a través de las funciones de /api.
 * - Con VITE_NEON_AUTH_URL (y DATABASE_URL en el servidor): productos, configuración, fotos y login real en Neon.
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
  available: true, featured: false, images: [], sort: 0, hidden: false, youtube_url: '',
  offer: '', offer_label: '',
}

export function normalizeProduct(p: Partial<Product> & { id: string }): Product {
  return {
    ...PRODUCT_DEFAULTS,
    ...p,
    price_list: p.price_list == null ? null : Number(p.price_list),
    discount_pct: Number(p.discount_pct || 0),
    colors: p.colors || [],
    images: p.images || [],
    sort: Number(p.sort || 0),
    hidden: Boolean(p.hidden),
    youtube_url: p.youtube_url || '',
    offer: p.offer || '',
    offer_label: p.offer_label || '',
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

// ------------------------------------------------------------------ Neon (a través del servidor)
//
// El navegador NO se conecta a la base de datos: le pide todo a las funciones de /api,
// que son las únicas que conocen DATABASE_URL. El login es con Neon Auth y el token
// de la sesión se manda al servidor, que verifica que sea de un admin antes de guardar.

const NEON_TOKEN_KEY = 'perez-neon-session-token'

function readToken() {
  try {
    return localStorage.getItem(NEON_TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(NEON_TOKEN_KEY, token)
    else localStorage.removeItem(NEON_TOKEN_KEY)
  } catch {
    // sin almacenamiento: la sesión dura mientras la pestaña esté abierta
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let res: Response
  try {
    res = await fetch(path, { ...init, headers })
  } catch {
    throw new Error('No hay conexión con el servidor. Revisá tu internet y probá de nuevo.')
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`)
  return data
}

const adminAction = <T = { ok: boolean }>(action: string, payload: Record<string, unknown> = {}) =>
  api<T>('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })

function neonBackend(authUrl: string): Backend {
  const authClient = createAuthClient(authUrl)
  let catalog: Promise<{ products: (Partial<Product> & { id: string })[]; settings: Partial<StoreSettings> | null }> | null = null
  // Productos y configuración llegan en un solo pedido
  const loadCatalog = () => {
    catalog ??= api<{ products: (Partial<Product> & { id: string })[]; settings: Partial<StoreSettings> | null }>('/api/catalog')
      .finally(() => setTimeout(() => { catalog = null }, 0))
    return catalog
  }

  return {
    mode: 'neon',
    async loadProducts() {
      return (await loadCatalog()).products.map(normalizeProduct)
    },
    async loadSettings() {
      return mergeSettings((await loadCatalog()).settings)
    },
    async saveProduct(product) {
      await adminAction('saveProduct', { product })
    },
    async saveProducts(products) {
      await adminAction('saveProducts', { products })
    },
    async deleteProduct(id) {
      await adminAction('deleteProduct', { id })
    },
    async saveSettings(settings) {
      await adminAction('saveSettings', { settings })
    },
    async uploadImage(file) {
      const { url } = await api<{ url: string }>('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'image/webp' },
        body: file,
      })
      return url
    },
    async signIn(email, password) {
      let res: { data?: { user?: { id: string }; token?: string } | null; error?: { message?: string } | null }
      try {
        res = await authClient.signIn.email({ email, password })
      } catch {
        throw new Error('E-mail o contraseña incorrectos')
      }
      if (res.error || !res.data?.user?.id || !res.data.token) {
        throw new Error('E-mail o contraseña incorrectos')
      }
      writeToken(res.data.token)
      const { admin } = await adminAction<{ admin: boolean }>('me')
      if (!admin) {
        await this.signOut()
        throw new Error('Este usuario no tiene permisos de administrador')
      }
    },
    async signOut() {
      try {
        await adminAction('logout')
      } catch {
        // si falla, igual se borra la sesión local
      }
      try {
        await authClient.signOut()
      } catch {
        // ignorar errores de red o cookies
      }
      writeToken(null)
    },
    async isAdmin() {
      if (!readToken()) return false
      try {
        return (await adminAction<{ admin: boolean }>('me')).admin
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

// La URL de Neon Auth es pública (no es una contraseña).
const DEFAULT_AUTH_URL = 'https://ep-holy-wind-b6ppegj5.neonauth.c-2.sa-east-1.aws.neon.tech/neondb/auth'
const authUrl = (import.meta.env.VITE_NEON_AUTH_URL as string | undefined) || DEFAULT_AUTH_URL
const hasNeon = !!authUrl && authUrl.startsWith('https://') && !authUrl.includes('ep-xxxx')

export const backend: Backend = hasNeon ? neonBackend(authUrl) : demoBackend()
