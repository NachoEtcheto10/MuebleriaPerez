import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_SETTINGS, type Product, type StoreSettings } from './types'

/**
 * Capa de datos de la tienda.
 * - Con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY: productos, configuración, fotos y login en Supabase.
 * - Sin ellas: "modo demo". Usa el catálogo del Excel y guarda los cambios solo en este navegador.
 */
export interface Backend {
  mode: 'supabase' | 'demo'
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
    // Si todavía no se cargó la dirección en Administración, se usa la del local
    address: data?.address || DEFAULT_SETTINGS.address,
    city: data?.address ? data.city || '' : DEFAULT_SETTINGS.city,
  }
}

const PRODUCT_DEFAULTS: Omit<Product, 'id'> = {
  code: '', name: '', description: '', category: 'otros', subcategory: null, brand: null, size: null,
  measure: null, material: null, kind: null, model: null, colors: [], price_list: null, discount_pct: 0,
  available: true, featured: false, images: [], sort: 0,
}

function normalizeProduct(p: Partial<Product> & { id: string }): Product {
  return {
    ...PRODUCT_DEFAULTS,
    ...p,
    price_list: p.price_list == null ? null : Number(p.price_list),
    discount_pct: Number(p.discount_pct || 0),
    colors: p.colors || [],
    images: p.images || [],
  }
}

// ------------------------------------------------------------------ Supabase

function supabaseBackend(client: SupabaseClient): Backend {
  const BUCKET = 'productos'
  return {
    mode: 'supabase',
    async loadProducts() {
      const all: Product[] = []
      // Supabase devuelve hasta 1000 filas por consulta
      for (let from = 0; ; from += 1000) {
        const { data, error } = await client.from('products').select('*').order('sort').range(from, from + 999)
        if (error) throw error
        all.push(...(data as Product[]).map(normalizeProduct))
        if (!data || data.length < 1000) break
      }
      return all
    },
    async loadSettings() {
      const { data, error } = await client.from('settings').select('data').eq('id', 1).maybeSingle()
      if (error) throw error
      return mergeSettings(data?.data)
    },
    async saveProduct(p) {
      const { error } = await client.from('products').upsert({ ...p, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    async saveProducts(list) {
      for (let i = 0; i < list.length; i += 200) {
        const { error } = await client
          .from('products')
          .upsert(list.slice(i, i + 200).map((p) => ({ ...p, updated_at: new Date().toISOString() })))
        if (error) throw error
      }
    },
    async deleteProduct(id) {
      const { error } = await client.from('products').delete().eq('id', id)
      if (error) throw error
    },
    async saveSettings(s) {
      const { error } = await client.from('settings').upsert({ id: 1, data: s })
      if (error) throw error
    },
    async uploadImage(file, name) {
      const path = `${Date.now()}-${name}`
      const { error } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
      if (error) throw error
      return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw new Error('E-mail o contraseña incorrectos')
      if (!(await this.isAdmin())) {
        await client.auth.signOut()
        throw new Error('Este usuario no tiene permisos de administrador')
      }
    },
    async signOut() {
      await client.auth.signOut()
    },
    async isAdmin() {
      const { data: session } = await client.auth.getSession()
      const uid = session.session?.user.id
      if (!uid) return false
      const { data } = await client.from('admins').select('user_id').eq('user_id', uid).maybeSingle()
      return !!data
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

function blobToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function demoBackend(): Backend {
  // El catálogo de prueba se descarga solo en modo demo
  const load = async () =>
    readLS<Product[]>(LS_PRODUCTS) || ((await import('../data/seed.json')).default as Product[]).map(normalizeProduct)
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

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const backend: Backend = url && key ? supabaseBackend(createClient(url, key)) : demoBackend()
