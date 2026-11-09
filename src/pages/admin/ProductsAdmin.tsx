import { useMemo, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { ProductImage } from '../../components/ProductImage'
import { backend, loadSeedProducts } from '../../lib/backend'
import { CATEGORIES, categoryLabel } from '../../lib/catalog'
import { parseProductsFile, type ImportResult } from '../../lib/excelImporter'
import { formatPrice } from '../../lib/format'
import { searchProducts } from '../../lib/search'
import { useStore } from '../../lib/store'
import { PROMO_OFFERS, type Product } from '../../lib/types'
import { syncYouTubeVideos, type YouTubeSyncResult } from '../../lib/youtubeSync'
import { useToast } from './AdminApp'

function Toggle({
  checked,
  onChange,
  label,
  activeColor = 'bg-piedra-800',
}: {
  checked: boolean
  onChange(v: boolean): void
  label: string
  activeColor?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? activeColor : 'bg-piedra-300'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
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
      const updated = target.map((p) => ({
        ...p,
        price_list: Math.round(((p.price_list as number) * (1 + n / 100)) / 10) * 10,
      }))
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
      <summary className="cursor-pointer select-none px-5 py-3 text-sm font-semibold">
        Actualizar precios de lista en %
      </summary>
      <div className="flex flex-wrap items-end gap-3 border-t border-piedra-100 px-5 py-4">
        <label className="text-sm">
          <span className="block font-medium">Categoría</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="mt-1 rounded-xl border border-piedra-200 px-3 py-2">
            <option value="">Todas</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-medium">Porcentaje (ej. 10 o -5)</span>
          <input
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            inputMode="decimal"
            placeholder="10"
            className="mt-1 w-32 rounded-xl border border-piedra-200 px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={apply}
          disabled={busy || !pct}
          className="rounded-xl bg-piedra-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
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
  const [subCat, setSubCat] = useState('')
  const [status, setStatus] = useState('')
  const [seeding, setSeeding] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Modales de Importación y YouTube Sync
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importBusy, setImportBusy] = useState(false)

  const [ytModalOpen, setYtModalOpen] = useState(false)
  const ytApiKey = (import.meta.env.VITE_YOUTUBE_API_KEY as string) || 'AIzaSyCZeQEG3YCujBfABUDewTXlZs9JxQAeK3c'
  const [ytChannelId, setYtChannelId] = useState(
    () => localStorage.getItem('perez_yt_channel') || (import.meta.env.VITE_YOUTUBE_CHANNEL_ID as string) || 'UCdGgCni4gJRWSXpo4BC65JA'
  )
  const [ytBusy, setYtBusy] = useState(false)
  const [ytResult, setYtResult] = useState<YouTubeSyncResult | null>(null)

  // Cantidad de productos por categoría para las badges
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of products) {
      map.set(p.category, (map.get(p.category) || 0) + 1)
    }
    return map
  }, [products])

  const currentCategory = useMemo(() => CATEGORIES.find((c) => c.slug === cat), [cat])

  const list = useMemo(() => {
    let l = q.trim() ? searchProducts(products, q) : [...products]
    if (cat) l = l.filter((p) => p.category === cat)
    if (subCat) l = l.filter((p) => p.subcategory === subCat)
    if (status === 'no-mostrar') l = l.filter((p) => p.hidden)
    if (status === 'visibles') l = l.filter((p) => !p.hidden)
    if (status === 'con-oferta') l = l.filter((p) => p.offer || p.discount_pct > 0)
    if (status === 'no-disponible') l = l.filter((p) => !p.available)
    if (status === 'destacado') l = l.filter((p) => p.featured)
    if (status === 'sin-precio') l = l.filter((p) => p.price_list == null)
    if (status === 'sin-foto') l = l.filter((p) => !p.images.length)

    // Ordenados por sort asc
    return l.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  }, [products, q, cat, subCat, status])

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

  // Guardar nuevo orden tras mover elementos
  const persistOrder = async (reorderedVisibleList: Product[]) => {
    setSavingOrder(true)
    try {
      const updatedProducts = reorderedVisibleList.map((item, index) => ({
        ...item,
        sort: index * 10,
      }))
      const map = new Map(updatedProducts.map((p) => [p.id, p]))
      const allUpdated = products.map((p) => map.get(p.id) || p)
      setProducts(allUpdated)
      await backend.saveProducts(updatedProducts)
      toast('Orden actualizado: se verá primero en la tienda al entrar a esta categoría')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error al guardar el orden', 'error')
    } finally {
      setSavingOrder(false)
    }
  }

  // Mover producto una posición arriba o abajo (para clicks directos o mobile)
  const movePosition = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= list.length) return
    const copy = [...list]
    const [moved] = copy.splice(index, 1)
    copy.splice(targetIndex, 0, moved)
    await persistOrder(copy)
  }

  // Drag and Drop handlers
  const handleDragStart = (e: DragEvent<HTMLLIElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedId(id)
  }

  const handleDragOver = (e: DragEvent<HTMLLIElement>, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) {
      setDragOverId(id)
    }
  }

  const handleDrop = async (e: DragEvent<HTMLLIElement>, targetId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId
    setDraggedId(null)
    setDragOverId(null)
    if (!sourceId || sourceId === targetId) return

    const sourceIdx = list.findIndex((p) => p.id === sourceId)
    const targetIdx = list.findIndex((p) => p.id === targetId)
    if (sourceIdx < 0 || targetIdx < 0) return

    const copy = [...list]
    const [moved] = copy.splice(sourceIdx, 1)
    copy.splice(targetIdx, 0, moved)
    await persistOrder(copy)
  }

  const handleSeedInitialCatalog = async () => {
    if (!confirm('¿Cargar los 297 productos iniciales de la planilla en la base de datos?')) return
    setSeeding(true)
    try {
      const seed = await loadSeedProducts()
      await backend.saveProducts(seed)
      setProducts(seed)
      toast(`Se cargaron ${seed.length} productos en la base de datos`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo cargar el catálogo inicial', 'error')
    } finally {
      setSeeding(false)
    }
  }

  // Manejo de archivo Excel/CSV cargado
  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setImportBusy(true)
    setImportResult(null)
    try {
      const res = await parseProductsFile(file, products)
      setImportResult(res)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error al procesar el archivo Excel', 'error')
      setImportFile(null)
    } finally {
      setImportBusy(false)
    }
  }

  const confirmImport = async () => {
    if (!importResult || importResult.newProducts.length === 0) return
    setImportBusy(true)
    try {
      await backend.saveProducts(importResult.newProducts)
      setProducts([...products, ...importResult.newProducts])
      toast(`¡Se importaron con éxito ${importResult.newProducts.length} productos nuevos!`)
      setImportModalOpen(false)
      setImportFile(null)
      setImportResult(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudieron guardar los productos', 'error')
    } finally {
      setImportBusy(false)
    }
  }

  // Sincronización con YouTube
  const handleSyncYouTube = async () => {
    if (!ytChannelId.trim()) {
      return toast('Ingresá el ID del canal o de la playlist de YouTube', 'error')
    }
    setYtBusy(true)
    setYtResult(null)
    try {
      localStorage.setItem('perez_yt_channel', ytChannelId.trim())

      const res = await syncYouTubeVideos(ytApiKey, ytChannelId, products)
      setYtResult(res)

      if (res.updatedProducts.length > 0) {
        await backend.saveProducts(res.updatedProducts)
        const map = new Map(res.updatedProducts.map((p) => [p.id, p]))
        setProducts(products.map((p) => map.get(p.id) || p))
        toast(`¡Se vincularon ${res.updatedProducts.length} videos a productos!`)
      } else {
        toast('No se encontraron videos nuevos con códigos que coincidan', 'error')
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error al sincronizar con YouTube', 'error')
    } finally {
      setYtBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Gestión de Productos</h1>
          <p className="text-sm text-piedra-500">
            {products.length} en total · {products.filter((p) => p.hidden).length} no mostrados (ocultos) ·{' '}
            {products.filter((p) => !p.available).length} no disponibles
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {products.length === 0 && (
            <button
              type="button"
              onClick={handleSeedInitialCatalog}
              disabled={seeding}
              className="flex items-center gap-2 rounded-xl border border-madera-500 bg-madera-50 px-4 py-2.5 text-sm font-semibold text-madera-700 hover:bg-madera-100 disabled:opacity-50"
            >
              {seeding ? 'Cargando 297 productos…' : 'Cargar catálogo inicial (297 productos)'}
            </button>
          )}

          {/* Botón Importar Excel / CSV */}
          <button
            type="button"
            onClick={() => { setImportModalOpen(true); setImportResult(null); setImportFile(null) }}
            className="flex items-center gap-2 rounded-xl border border-piedra-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-piedra-800 hover:bg-piedra-50 shadow-xs"
          >
            <Icon name="upload" size={17} />
            <span>Importar Excel / CSV</span>
          </button>

          {/* Botón Sincronizar YouTube */}
          <button
            type="button"
            onClick={() => { setYtModalOpen(true); setYtResult(null) }}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 shadow-xs"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span>Sincronizar YouTube</span>
          </button>

          <Link
            to="/admin/productos/nuevo"
            className="flex items-center gap-2 rounded-xl bg-piedra-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-piedra-900 shadow-sm"
          >
            <Icon name="plus" size={18} /> Nuevo producto
          </Link>
        </div>
      </div>

      <BulkPrices products={products} />

      {/* Badges de Categoría horizontales (sin 'Otros') */}
      <section className="rounded-2xl border border-piedra-200 bg-white p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-piedra-500">
            Filtrar por categoría
          </span>
          {cat && (
            <button
              type="button"
              onClick={() => { setCat(''); setSubCat('') }}
              className="text-xs font-semibold text-madera-700 hover:underline"
            >
              Ver todas ({products.length})
            </button>
          )}
        </div>
        <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => { setCat(''); setSubCat('') }}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              !cat
                ? 'border-piedra-900 bg-piedra-900 text-white shadow'
                : 'border-piedra-200 bg-white text-piedra-700 hover:border-piedra-400 hover:bg-piedra-50'
            }`}
          >
            <span>Todas</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${!cat ? 'bg-white/20 text-white' : 'bg-piedra-100 text-piedra-600'}`}>
              {products.length}
            </span>
          </button>
          {CATEGORIES.filter((c) => c.slug !== 'otros').map((c) => {
            const count = categoryCounts.get(c.slug) || 0
            const active = cat === c.slug
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => { setCat(active ? '' : c.slug); setSubCat('') }}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'border-piedra-900 bg-piedra-900 text-white shadow'
                    : 'border-piedra-200 bg-white text-piedra-700 hover:border-piedra-400 hover:bg-piedra-50'
                }`}
              >
                <span>{c.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-piedra-100 text-piedra-600'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Subcategorías si hay una categoría seleccionada */}
        {currentCategory && currentCategory.subcategories.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-piedra-100 pt-2.5 text-xs">
            <span className="font-medium text-piedra-400 mr-1">Subcategorías:</span>
            <button
              type="button"
              onClick={() => setSubCat('')}
              className={`rounded-lg px-2.5 py-1 font-medium ${!subCat ? 'bg-piedra-800 text-white' : 'bg-piedra-100 text-piedra-700 hover:bg-piedra-200'}`}
            >
              Todas
            </button>
            {currentCategory.subcategories.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => setSubCat(subCat === s.slug ? '' : s.slug)}
                className={`rounded-lg px-2.5 py-1 font-medium ${subCat === s.slug ? 'bg-piedra-800 text-white' : 'bg-piedra-100 text-piedra-700 hover:bg-piedra-200'}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Buscador y Filtros secundarios */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-piedra-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o código…"
            type="search"
            className="w-full rounded-xl border border-piedra-200 bg-white pl-10 pr-3 py-2.5 text-[16px] sm:text-sm outline-none focus:border-madera-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-piedra-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="visibles">Solo visibles en tienda</option>
          <option value="con-oferta">Con oferta activa 🔥</option>
          <option value="no-mostrar">Ocultos / No mostrar</option>
          <option value="no-disponible">No disponibles (en gris)</option>
          <option value="destacado">Destacados</option>
          <option value="sin-precio">Sin precio</option>
          <option value="sin-foto">Sin foto</option>
        </select>
        {savingOrder && (
          <span className="text-xs font-semibold text-madera-700 animate-pulse">
            Guardando orden…
          </span>
        )}
      </div>

      {/* Aviso de orden por arrastre */}
      <div className="flex items-center gap-2 rounded-xl bg-madera-50 px-4 py-2.5 text-xs text-madera-800 border border-madera-200">
        <Icon name="info" size={16} className="shrink-0 text-madera-700" />
        <span>
          <strong>Orden de aparición:</strong> Mantené presionado y arrastrá cualquier producto (o usá las flechas ▲ ▼) para cambiar su posición. El producto arriba de todo aparecerá primero cuando los clientes entren a esa categoría.
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-piedra-200 bg-white shadow-sm">
        {/* Encabezado Desktop */}
        <div className="hidden grid-cols-[44px_64px_1fr_120px_100px_160px_80px_80px_85px_75px] items-center gap-3 border-b border-piedra-100 bg-piedra-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-piedra-500 lg:grid">
          <span className="text-center" title="Arrastrar para ordenar">Orden</span>
          <span>Foto</span>
          <span>Producto</span>
          <span>Categoría</span>
          <span className="text-right">Precio lista</span>
          <span className="text-center text-red-700">Ofertas</span>
          <span className="text-center">Disponible</span>
          <span className="text-center">Destacado</span>
          <span className="text-center text-red-700">No mostrar</span>
          <span className="text-right">Acciones</span>
        </div>

        {/* Lista de Productos con Drag & Drop */}
        <ul className="divide-y divide-piedra-100">
          {list.slice(0, 300).map((p, idx) => {
            const isDragging = draggedId === p.id
            const isDragOver = dragOverId === p.id

            return (
              <li
                key={p.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, p.id)}
                onDragOver={(e) => handleDragOver(e, p.id)}
                onDragEnd={() => { setDraggedId(null); setDragOverId(null) }}
                onDrop={(e) => handleDrop(e, p.id)}
                className={`grid grid-cols-[36px_56px_1fr_auto] items-center gap-3 px-4 py-3 transition-colors lg:grid-cols-[44px_64px_1fr_120px_100px_160px_80px_80px_85px_75px] ${
                  isDragging ? 'opacity-40 bg-piedra-100' : isDragOver ? 'bg-madera-100 border-y-2 border-madera-600' : p.hidden ? 'bg-red-50/40' : 'hover:bg-piedra-50/70'
                }`}
              >
                {/* Control de Orden: Agarrador Drag & Drop y botones ▲ ▼ */}
                <div className="flex flex-col items-center justify-center gap-0.5 text-piedra-400">
                  <span
                    className="cursor-grab active:cursor-grabbing p-1 hover:text-piedra-800"
                    title="Arrastrá para reordenar"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="5" r="1.7" />
                      <circle cx="15" cy="5" r="1.7" />
                      <circle cx="9" cy="12" r="1.7" />
                      <circle cx="15" cy="12" r="1.7" />
                      <circle cx="9" cy="19" r="1.7" />
                      <circle cx="15" cy="19" r="1.7" />
                    </svg>
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => movePosition(idx, -1)}
                      className="rounded p-0.5 text-piedra-400 hover:bg-piedra-200 hover:text-piedra-800 disabled:opacity-20"
                      title="Mover arriba"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === list.length - 1}
                      onClick={() => movePosition(idx, 1)}
                      className="rounded p-0.5 text-piedra-400 hover:bg-piedra-200 hover:text-piedra-800 disabled:opacity-20"
                      title="Mover abajo"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {/* Foto */}
                <ProductImage product={p} badge={false} className="h-12 w-14 rounded-lg lg:w-16" />

                {/* Datos del Producto */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/productos/${p.id}`}
                      className="line-clamp-2 text-sm font-medium hover:text-madera-700"
                    >
                      {p.name}
                    </Link>
                    {p.hidden && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[0.68rem] font-bold text-red-700">
                        No se muestra
                      </span>
                    )}
                    {p.youtube_url && (
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-[0.65rem] font-semibold" title="Tiene video de YouTube vinculado">
                        ▶ Video
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-piedra-500">
                    Cód. {p.code}
                    <span className="lg:hidden">
                      {' '}· {p.price_list != null ? formatPrice(p.price_list) : 'Sin precio'}
                    </span>
                  </p>

                  {/* Toggles en vista Mobile */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-piedra-600 lg:hidden">
                    <span className="flex items-center gap-1.5">
                      <Toggle checked={p.available} onChange={(v) => patch(p, { available: v })} label="Disponible" />
                      <span>Disp.</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Toggle checked={p.featured} onChange={(v) => patch(p, { featured: v })} label="Destacado" />
                      <span>Dest.</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-red-700">
                      <Toggle
                        checked={Boolean(p.hidden)}
                        onChange={(v) => patch(p, { hidden: v })}
                        label="No mostrar"
                        activeColor="bg-red-600"
                      />
                      <span>No mostrar</span>
                    </span>
                  </div>

                  {/* Selector de Oferta en Mobile */}
                  <div className="mt-2.5 flex items-center gap-2 lg:hidden">
                    <span className="text-xs font-semibold text-red-700">Oferta:</span>
                    <select
                      value={p.offer || ''}
                      onChange={(e) => {
                        const chosen = PROMO_OFFERS.find((o) => o.id === e.target.value) || PROMO_OFFERS[0]
                        patch(p, {
                          offer: chosen.id,
                          offer_label: chosen.badge,
                          discount_pct: chosen.discountPct || 0,
                        })
                        toast(chosen.id ? `Oferta asignada: ${chosen.label}` : 'Oferta quitada')
                      }}
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold outline-none ${
                        p.offer ? 'border-red-300 bg-red-50 text-red-700' : 'border-piedra-200 bg-white text-piedra-600'
                      }`}
                    >
                      {PROMO_OFFERS.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Categoría Desktop */}
                <span className="hidden text-sm text-piedra-600 lg:block">
                  {categoryLabel(p.category, p.subcategory)}
                </span>

                {/* Precio Lista Desktop */}
                <span className="hidden text-right text-sm font-semibold lg:block">
                  {p.price_list != null ? formatPrice(p.price_list) : <span className="text-piedra-400">Sin precio</span>}
                </span>

                {/* Columna Desplegable de Ofertas Desktop */}
                <div className="hidden lg:block">
                  <select
                    value={p.offer || ''}
                    onChange={(e) => {
                      const chosen = PROMO_OFFERS.find((o) => o.id === e.target.value) || PROMO_OFFERS[0]
                      patch(p, {
                        offer: chosen.id,
                        offer_label: chosen.badge,
                        discount_pct: chosen.discountPct || 0,
                      })
                      toast(chosen.id ? `Oferta aplicada: ${chosen.label}` : 'Oferta quitada')
                    }}
                    className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-semibold outline-none transition cursor-pointer ${
                      p.offer
                        ? 'border-red-300 bg-red-50 text-red-700 font-bold shadow-2xs'
                        : 'border-piedra-200 bg-white text-piedra-600 hover:border-piedra-400'
                    }`}
                  >
                    {PROMO_OFFERS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Toggle Disponible Desktop */}
                <span className="hidden justify-center lg:flex">
                  <Toggle
                    checked={p.available}
                    onChange={(v) => patch(p, { available: v })}
                    label={`Disponible: ${p.name}`}
                  />
                </span>

                {/* Toggle Destacado Desktop */}
                <span className="hidden justify-center lg:flex">
                  <Toggle
                    checked={p.featured}
                    onChange={(v) => patch(p, { featured: v })}
                    label={`Destacado: ${p.name}`}
                  />
                </span>

                {/* Toggle NO MOSTRAR Desktop (en rojo destacado) */}
                <span className="hidden justify-center lg:flex">
                  <Toggle
                    checked={Boolean(p.hidden)}
                    onChange={(v) => patch(p, { hidden: v })}
                    label={`No mostrar: ${p.name}`}
                    activeColor="bg-red-600"
                  />
                </span>

                {/* Acciones */}
                <span className="flex justify-end gap-1">
                  <Link
                    to={`/admin/productos/${p.id}`}
                    className="rounded-lg p-2 text-piedra-500 hover:bg-piedra-100 hover:text-piedra-900"
                    aria-label="Editar"
                  >
                    <Icon name="edit" size={18} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    className="rounded-lg p-2 text-piedra-500 hover:bg-red-50 hover:text-red-700"
                    aria-label="Eliminar"
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>

        {list.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-piedra-500">
            No hay productos con esos filtros.
          </p>
        )}
        {list.length > 300 && (
          <p className="px-4 py-3 text-center text-xs text-piedra-500">
            Mostrando 300 de {list.length}. Usá el buscador para encontrar el resto.
          </p>
        )}
      </div>

      {/* MODAL DE IMPORTACIÓN EXCEL / CSV */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-piedra-100 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold">Importar productos desde Excel o CSV</h2>
                <p className="text-xs text-piedra-500">Cargá una planilla (.xlsx, .xls o .csv). Los productos repetidos se filtran automáticamente.</p>
              </div>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="rounded-lg p-1.5 text-piedra-400 hover:bg-piedra-100 hover:text-piedra-700"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-piedra-300 bg-piedra-50 p-6 text-center cursor-pointer hover:border-madera-500 hover:bg-madera-50/40">
                <Icon name="upload" size={32} className="text-piedra-400" />
                <span className="font-semibold text-sm text-piedra-700">
                  {importFile ? importFile.name : 'Hacé clic para seleccionar o arrastrá un archivo Excel (.xlsx, .xls, .csv)'}
                </span>
                <span className="text-xs text-piedra-500">No importa si las columnas no están en orden, el sistema las detecta automáticamente.</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={onFileSelected}
                  className="sr-only"
                />
              </label>

              {importBusy && (
                <p className="text-center text-sm font-semibold text-madera-700 animate-pulse">
                  Procesando archivo y verificando duplicados…
                </p>
              )}

              {importResult && (
                <div className="space-y-3 rounded-2xl border border-piedra-200 bg-piedra-50/50 p-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="font-semibold text-piedra-800">
                      Total de filas leídas: <strong>{importResult.totalRows}</strong>
                    </span>
                    <span className="font-semibold text-green-700">
                      ✓ Nuevos para agregar: <strong>{importResult.newProducts.length}</strong>
                    </span>
                    <span className="font-semibold text-amber-700">
                      ⚠ Omitidos (ya existen): <strong>{importResult.skippedCount}</strong>
                    </span>
                  </div>

                  {importResult.newProducts.length > 0 ? (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-piedra-500 mb-1.5">
                        Vista previa de nuevos productos ({importResult.newProducts.length}):
                      </p>
                      <div className="max-h-48 overflow-y-auto rounded-xl border border-piedra-200 bg-white">
                        <table className="w-full text-xs">
                          <thead className="bg-piedra-100 text-piedra-600 sticky top-0">
                            <tr>
                              <th className="p-2 text-left font-bold">Cód</th>
                              <th className="p-2 text-left font-bold">Nombre</th>
                              <th className="p-2 text-left font-bold">Categoría</th>
                              <th className="p-2 text-right font-bold">Precio</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-piedra-100">
                            {importResult.newProducts.slice(0, 50).map((p) => (
                              <tr key={p.id}>
                                <td className="p-2 font-mono font-medium">{p.code}</td>
                                <td className="p-2">{p.name}</td>
                                <td className="p-2 text-piedra-600">{p.category}</td>
                                <td className="p-2 text-right font-semibold">
                                  {p.price_list != null ? formatPrice(p.price_list) : 'Consultar'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {importResult.newProducts.length > 50 && (
                        <p className="text-[0.7rem] text-piedra-400 mt-1">Mostrando los primeros 50 de {importResult.newProducts.length} productos nuevos.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      Todos los productos de este archivo ya existen en la tienda. No hay productos nuevos para agregar.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-piedra-100 pt-4">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="rounded-xl border border-piedra-300 px-4 py-2.5 text-sm font-semibold text-piedra-700 hover:bg-piedra-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!importResult || importResult.newProducts.length === 0 || importBusy}
                onClick={confirmImport}
                className="rounded-xl bg-piedra-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-piedra-900 disabled:opacity-50"
              >
                {importBusy ? 'Guardando…' : `Confirmar y agregar ${importResult?.newProducts.length || 0} productos`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SINCRONIZACIÓN DE YOUTUBE */}
      {ytModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-piedra-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </span>
                <h2 className="font-display text-xl font-bold">Sincronizar videos de YouTube</h2>
              </div>
              <button
                type="button"
                onClick={() => setYtModalOpen(false)}
                className="rounded-lg p-1.5 text-piedra-400 hover:bg-piedra-100 hover:text-piedra-700"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <p className="mt-3 text-xs text-piedra-600">
              Busca los videos subidos a tu canal (incluso <strong>no listados</strong>) y, si en el título o descripción incluís <strong>cód.(código)</strong> o <strong>cód. CÓDIGO</strong> (ej.: <code>cód.(SOF-01)</code>, <code>cód.123</code> o <code>cód. SOF-01</code>), lo asocia automáticamente a ese producto.
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-piedra-50 border border-piedra-200 px-3.5 py-2.5 text-xs">
                <span className="text-piedra-600 font-medium">Conexión con YouTube API</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-green-700 bg-green-100/70 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                  Conectada y lista
                </span>
              </div>

              <label className="block text-sm">
                <span className="font-medium text-piedra-700">ID del Canal o ID de Lista de Reproducción</span>
                <input
                  value={ytChannelId}
                  onChange={(e) => setYtChannelId(e.target.value)}
                  placeholder="UCxxxxxxxxxxxxxxxxxxxxxx o PLxxxxxxxx"
                  className="mt-1 w-full rounded-xl border border-piedra-200 px-3 py-2 text-sm outline-none focus:border-red-500 font-mono"
                />
                <span className="mt-1 block text-[0.7rem] text-piedra-400">
                  Canal (empieza con UC...) o Playlist de videos (empieza con PL...).
                </span>
              </label>

              {ytResult && (
                <div className="mt-3 rounded-2xl border border-piedra-200 bg-piedra-50 p-4 text-xs">
                  <p className="font-bold text-piedra-800">
                    Resultado: {ytResult.matchedCount} videos vinculados a productos.
                  </p>
                  {ytResult.details.length > 0 && (
                    <ul className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                      {ytResult.details.map((d) => (
                        <li key={d.code} className="flex justify-between items-center bg-white p-2 rounded-lg border border-piedra-100">
                          <span className="font-mono font-bold text-piedra-900">{d.code}</span>
                          <span className="truncate max-w-[200px] text-piedra-600">{d.title}</span>
                          <span className="text-green-700 font-bold">✓ Vinculado</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-piedra-100 pt-4">
              <button
                type="button"
                onClick={() => setYtModalOpen(false)}
                className="rounded-xl border border-piedra-300 px-4 py-2 text-sm font-semibold text-piedra-700 hover:bg-piedra-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={ytBusy || !ytChannelId.trim()}
                onClick={handleSyncYouTube}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {ytBusy ? 'Sincronizando…' : 'Buscar y vincular videos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
