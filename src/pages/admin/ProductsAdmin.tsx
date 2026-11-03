import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { ProductImage } from '../../components/ProductImage'
import { backend } from '../../lib/backend'
import { CATEGORIES, categoryLabel } from '../../lib/catalog'
import { formatPrice } from '../../lib/format'
import { searchProducts } from '../../lib/search'
import { useStore } from '../../lib/store'
import type { Product } from '../../lib/types'
import { useToast } from './AdminApp'

function Toggle({ checked, onChange, label }: { checked: boolean; onChange(v: boolean): void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-piedra-800' : 'bg-piedra-300'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function BulkPrices({ products }: { products: Product[] }) {
  const { products: all, setProducts } = useStore()
  const toast = useToast()
  const [pct, setPct] = useState('')
  const [scope, setScope] = useState('')
  const [busy, setBusy] = useState(false)
  const target = products.filter((p) => p.price_list != null && (!scope || p.category === scope))

  const apply = async () => {
    const n = Number(pct.replace(',', '.'))
    if (!n || !target.length) return
    if (!confirm(`¿Modificar ${n > 0 ? '+' : ''}${n}% el precio de lista de ${target.length} productos?`)) return
    setBusy(true)
    try {
      const updated = target.map((p) => ({ ...p, price_list: Math.round(((p.price_list as number) * (1 + n / 100)) / 10) * 10 }))
      await backend.saveProducts(updated)
      const map = new Map(updated.map((p) => [p.id, p]))
      setProducts(all.map((p) => map.get(p.id) || p))
      toast(`Precios actualizados (${updated.length} productos)`)
      setPct('')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo actualizar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="rounded-2xl border border-piedra-200 bg-white">
      <summary className="cursor-pointer select-none px-5 py-3 text-sm font-semibold">Actualizar precios de lista en %</summary>
      <div className="flex flex-wrap items-end gap-3 border-t border-piedra-100 px-5 py-4">
        <label className="text-sm">
          <span className="block font-medium">Categoría</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="mt-1 rounded-xl border border-piedra-200 px-3 py-2">
            <option value="">Todas</option>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-medium">Porcentaje (ej. 10 o -5)</span>
          <input value={pct} onChange={(e) => setPct(e.target.value)} inputMode="decimal" placeholder="10"
            className="mt-1 w-32 rounded-xl border border-piedra-200 px-3 py-2" />
        </label>
        <button type="button" onClick={apply} disabled={busy || !pct}
          className="rounded-xl bg-piedra-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          Aplicar a {target.length} productos
        </button>
        <p className="w-full text-xs text-piedra-500">Redondea a la decena. Los productos sin precio no se tocan.</p>
      </div>
    </details>
  )
}

export function ProductsAdmin() {
  const { products, setProducts } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState('')

  const list = useMemo(() => {
    let l = q.trim() ? searchProducts(products, q) : products
    if (cat) l = l.filter((p) => p.category === cat)
    if (status === 'no-disponible') l = l.filter((p) => !p.available)
    if (status === 'destacado') l = l.filter((p) => p.featured)
    if (status === 'sin-precio') l = l.filter((p) => p.price_list == null)
    if (status === 'sin-foto') l = l.filter((p) => !p.images.length)
    return l
  }, [products, q, cat, status])

  const patch = async (p: Product, changes: Partial<Product>) => {
    const next = { ...p, ...changes }
    setProducts(products.map((x) => (x.id === p.id ? next : x)))
    try {
      await backend.saveProduct(next)
    } catch (e) {
      setProducts(products)
      toast(e instanceof Error ? e.message : 'No se pudo guardar', 'error')
    }
  }

  const remove = async (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await backend.deleteProduct(p.id)
      setProducts(products.filter((x) => x.id !== p.id))
      toast('Producto eliminado')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo eliminar', 'error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Productos</h1>
          <p className="text-sm text-piedra-500">{products.length} en total · {products.filter((p) => !p.available).length} no disponibles</p>
        </div>
        <Link to="/admin/productos/nuevo" className="flex items-center gap-2 rounded-xl bg-piedra-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-piedra-900">
          <Icon name="plus" size={18} /> Nuevo producto
        </Link>
      </div>

      <BulkPrices products={products} />

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o código…" type="search"
          className="min-w-[220px] flex-1 rounded-xl border border-piedra-200 bg-white px-3 py-2.5 text-[16px] sm:text-sm" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-xl border border-piedra-200 bg-white px-3 py-2.5 text-sm">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-piedra-200 bg-white px-3 py-2.5 text-sm">
          <option value="">Todos</option>
          <option value="no-disponible">No disponibles</option>
          <option value="destacado">Destacados</option>
          <option value="sin-precio">Sin precio</option>
          <option value="sin-foto">Sin foto</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-piedra-200 bg-white">
        <div className="hidden grid-cols-[64px_1fr_150px_120px_90px_90px_90px] items-center gap-3 border-b border-piedra-100 bg-piedra-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-piedra-500 lg:grid">
          <span>Foto</span><span>Producto</span><span>Categoría</span><span className="text-right">Precio lista</span>
          <span className="text-center">Disponible</span><span className="text-center">Destacado</span><span />
        </div>
        <ul className="divide-y divide-piedra-100">
          {list.slice(0, 300).map((p) => (
            <li key={p.id} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 px-4 py-3 lg:grid-cols-[64px_1fr_150px_120px_90px_90px_90px]">
              <ProductImage product={p} badge={false} className="h-12 w-14 rounded-lg lg:w-16" />
              <div className="min-w-0">
                <Link to={`/admin/productos/${p.id}`} className="line-clamp-2 text-sm font-medium hover:text-madera-700">{p.name}</Link>
                <p className="text-xs text-piedra-500">Cód. {p.code}<span className="lg:hidden"> · {p.price_list != null ? formatPrice(p.price_list) : 'Sin precio'}</span></p>
                <div className="mt-2 flex items-center gap-4 text-xs text-piedra-600 lg:hidden">
                  <span className="flex items-center gap-2"><Toggle checked={p.available} onChange={(v) => patch(p, { available: v })} label="Disponible" /> Disponible</span>
                  <span className="flex items-center gap-2"><Toggle checked={p.featured} onChange={(v) => patch(p, { featured: v })} label="Destacado" /> Destacado</span>
                </div>
              </div>
              <span className="hidden text-sm text-piedra-600 lg:block">{categoryLabel(p.category, p.subcategory)}</span>
              <span className="hidden text-right text-sm font-semibold lg:block">{p.price_list != null ? formatPrice(p.price_list) : <span className="text-piedra-400">Sin precio</span>}</span>
              <span className="hidden justify-center lg:flex"><Toggle checked={p.available} onChange={(v) => patch(p, { available: v })} label={`Disponible: ${p.name}`} /></span>
              <span className="hidden justify-center lg:flex"><Toggle checked={p.featured} onChange={(v) => patch(p, { featured: v })} label={`Destacado: ${p.name}`} /></span>
              <span className="flex justify-end gap-1">
                <Link to={`/admin/productos/${p.id}`} className="rounded-lg p-2 text-piedra-500 hover:bg-piedra-100 hover:text-piedra-900" aria-label="Editar"><Icon name="edit" size={18} /></Link>
                <button type="button" onClick={() => remove(p)} className="rounded-lg p-2 text-piedra-500 hover:bg-red-50 hover:text-red-700" aria-label="Eliminar"><Icon name="trash" size={18} /></button>
              </span>
            </li>
          ))}
        </ul>
        {list.length === 0 && <p className="px-4 py-10 text-center text-sm text-piedra-500">No hay productos con esos filtros.</p>}
        {list.length > 300 && <p className="px-4 py-3 text-center text-xs text-piedra-500">Mostrando 300 de {list.length}. Usá el buscador para encontrar el resto.</p>}
      </div>
    </div>
  )
}
