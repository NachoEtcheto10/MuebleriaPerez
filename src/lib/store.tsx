import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { backend } from './backend'
import { DEFAULT_SETTINGS, type CartItem, type Product, type StoreSettings } from './types'

interface StoreValue {
  loading: boolean
  error: string | null
  products: Product[]
  byId: Map<string, Product>
  settings: StoreSettings
  reload(): Promise<void>
  setProducts(list: Product[]): void
  setSettings(s: StoreSettings): void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([backend.loadProducts(), backend.loadSettings()])
      setProducts(p)
      setSettings(s)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  return (
    <StoreContext.Provider value={{ loading, error, products, byId, settings, reload, setProducts, setSettings }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore fuera de StoreProvider')
  return ctx
}

// ------------------------------------------------------------------ Carrito

interface CartValue {
  items: CartItem[]
  count: number
  open: boolean
  setOpen(v: boolean): void
  add(id: string, qty?: number, color?: string): void
  update(index: number, qty: number): void
  setColor(index: number, color: string): void
  remove(index: number): void
  clear(): void
}

const CartContext = createContext<CartValue | null>(null)
const LS_CART = 'perez-cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_CART) || '[]')
    } catch {
      return []
    }
  })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(LS_CART, JSON.stringify(items))
    } catch {
      /* sin almacenamiento: el carrito vive mientras la pestaña esté abierta */
    }
  }, [items])

  const value: CartValue = {
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
    open,
    setOpen,
    add(id, qty = 1, color) {
      setItems((prev) => {
        const i = prev.findIndex((x) => x.id === id && x.color === color)
        if (i >= 0) return prev.map((x, j) => (j === i ? { ...x, qty: x.qty + qty } : x))
        return [...prev, { id, qty, color }]
      })
      setOpen(true)
    },
    update(index, qty) {
      setItems((prev) => prev.map((x, j) => (j === index ? { ...x, qty: Math.max(1, qty) } : x)))
    },
    setColor(index, color) {
      setItems((prev) => {
        const target = prev[index]
        if (!target) return prev
        // Si ya hay una línea con ese producto y color, se suman
        const dup = prev.findIndex((x, j) => j !== index && x.id === target.id && x.color === color)
        if (dup >= 0) return prev.map((x, j) => (j === dup ? { ...x, qty: x.qty + target.qty } : x)).filter((_, j) => j !== index)
        return prev.map((x, j) => (j === index ? { ...x, color } : x))
      })
    },
    remove(index) {
      setItems((prev) => prev.filter((_, j) => j !== index))
    },
    clear() {
      setItems([])
    },
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart fuera de CartProvider')
  return ctx
}
