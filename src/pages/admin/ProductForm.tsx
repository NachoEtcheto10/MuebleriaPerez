import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { backend } from '../../lib/backend'
import { CATEGORIES, SIZES, getCategory } from '../../lib/catalog'
import { formatPrice, slugify } from '../../lib/format'
import { compressImage } from '../../lib/image'
import { cashPrice, listPrice, quotePlan } from '../../lib/pricing'
import { useStore } from '../../lib/store'
import { PROMO_OFFERS, type Product } from '../../lib/types'
import { useToast } from './AdminApp'

const EMPTY: Product = {
  id: '', code: '', name: '', description: '', category: 'habitacion', subcategory: null, brand: null, size: null,
  measure: null, material: null, kind: null, model: null, colors: [], price_list: null, discount_pct: 0,
  available: true, featured: false, images: [], sort: 0, hidden: false, youtube_url: '',
}

const input = 'mt-1 w-full rounded-xl border border-piedra-200 bg-white px-3 py-2.5 text-[16px] outline-none focus:border-madera-500 focus:ring-4 focus:ring-madera-100 sm:text-sm'

function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-piedra-500">{hint}</span>}
    </label>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-piedra-200 bg-white p-5">
      <h2 className="mb-4 font-display font-bold">{title}</h2>
      {children}
    </section>
  )
}

export function ProductForm() {
  const { id } = useParams()
  const isNew = !id
  const { products, byId, settings, setProducts } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [p, setP] = useState<Product>(EMPTY)
  const [colors, setColors] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(0)

  useEffect(() => {
    const existing = id ? byId.get(id) : undefined
    const base = existing || EMPTY
    setP(base)
    setColors(base.colors.join(', '))
    setPrice(base.price_list != null ? String(base.price_list) : '')
  }, [id, byId])

  if (!isNew && !byId.get(id!)) {
    return <p className="py-10 text-center text-piedra-500">No se encontró el producto. <Link to="/admin" className="font-semibold text-madera-700">Volver</Link></p>
  }

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((prev) => ({ ...prev, [k]: v }))
  const category = getCategory(p.category)
  const isMattress = p.category === 'colchones'
  const preview: Product = { ...p, price_list: price.trim() ? Number(price.replace(/\./g, '').replace(',', '.')) : null }
  const finalPrice = listPrice(preview)

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(files.length)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        const blob = await compressImage(file)
        urls.push(await backend.uploadImage(blob, `${slugify(p.code || p.name || 'producto')}.webp`))
        setUploading((n) => n - 1)
      }
      setP((prev) => ({ ...prev, images: [...prev.images, ...urls] }))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo subir la foto', 'error')
    } finally {
      setUploading(0)
    }
  }

  const moveImage = (i: number, dir: -1 | 1) => {
    const imgs = [...p.images]
    const j = i + dir
    if (j < 0 || j >= imgs.length) return
    ;[imgs[i], imgs[j]] = [imgs[j], imgs[i]]
    set('images', imgs)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!p.code.trim() || !p.name.trim()) return toast('Completá el código y el nombre', 'error')
    if (preview.price_list != null && (Number.isNaN(preview.price_list) || preview.price_list < 0)) return toast('El precio no es válido', 'error')
    let newId = p.id
    if (isNew) {
      const base = slugify(p.name) || slugify(p.code)
      newId = base
      for (let n = 2; byId.has(newId); n++) newId = `${base}-${n}`
    }
    const product: Product = {
      ...preview,
      id: newId,
      code: p.code.trim(),
      name: p.name.trim(),
      colors: colors.split(',').map((c) => c.trim()).filter(Boolean),
      brand: p.brand?.trim() || null,
      measure: p.measure?.trim() || null,
      model: isMattress ? p.model || slugify(`${p.name.replace(/\d{2,3}\s*x\s*\d{2,3}/i, '')}`) : null,
      size: isMattress ? p.size : null,
      material: isMattress ? p.material : null,
      kind: isMattress ? p.kind : null,
      sort: isNew ? Math.max(0, ...products.map((x) => x.sort)) + 1 : p.sort,
    }
    setBusy(true)
    try {
      await backend.saveProduct(product)
      setProducts(isNew ? [...products, product] : products.map((x) => (x.id === product.id ? product : x)))
      toast(isNew ? 'Producto creado' : 'Cambios guardados')
      navigate('/admin')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin" className="flex items-center gap-1 text-sm text-piedra-500 hover:text-piedra-800"><Icon name="chevronLeft" size={16} /> Productos</Link>
          <h1 className="mt-1 font-display text-2xl font-bold">{isNew ? 'Nuevo producto' : 'Editar producto'}</h1>
        </div>
        <div className="flex gap-2">
          {!isNew && <Link to={`/producto/${p.id}`} target="_blank" className="rounded-xl border border-piedra-200 bg-white px-4 py-2.5 text-sm font-semibold">Ver en la tienda</Link>}
          <button type="submit" disabled={busy || uploading > 0} className="rounded-xl bg-piedra-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card title="Artículo">
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <Field label="Código *"><input value={p.code} onChange={(e) => set('code', e.target.value)} required className={input} /></Field>
              <Field label="Nombre *"><input value={p.name} onChange={(e) => set('name', e.target.value)} required className={input} /></Field>
            </div>
            <Field label="Descripción" className="mt-4" hint="Medidas, materiales, terminaciones… Se muestra en la ficha del producto.">
              <textarea value={p.description} onChange={(e) => set('description', e.target.value)} rows={4} className={input} />
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Marca"><input value={p.brand || ''} onChange={(e) => set('brand', e.target.value)} className={input} /></Field>
              <Field label="Colores" hint="Separados por coma. Ej.: Blanco, Wengue, Venezia">
                <input value={colors} onChange={(e) => setColors(e.target.value)} className={input} />
              </Field>
            </div>
          </Card>

          <Card title="Categoría">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoría">
                <select value={p.category} onChange={(e) => setP({ ...p, category: e.target.value, subcategory: getCategory(e.target.value)?.subcategories[0]?.slug || null })} className={input}>
                  {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Subcategoría">
                <select value={p.subcategory || ''} onChange={(e) => set('subcategory', e.target.value || null)} className={input} disabled={!category?.subcategories.length}>
                  {!category?.subcategories.length && <option value="">—</option>}
                  {category?.subcategories.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                </select>
              </Field>
            </div>
            {isMattress && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Medida (tamaño)">
                  <select value={p.size || ''} onChange={(e) => set('size', e.target.value || null)} className={input}>
                    <option value="">—</option>
                    {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Medida en cm" hint="Ej.: 140x190"><input value={p.measure || ''} onChange={(e) => set('measure', e.target.value)} className={input} /></Field>
                <Field label="Tipo">
                  <select value={p.material || ''} onChange={(e) => set('material', e.target.value || null)} className={input}>
                    <option value="">—</option><option value="resortes">Resortes</option><option value="espuma">Espuma</option>
                  </select>
                </Field>
                <Field label="Presentación">
                  <select value={p.kind || ''} onChange={(e) => set('kind', e.target.value || null)} className={input}>
                    <option value="">—</option><option value="colchon">Solo colchón</option><option value="conjunto">Conjunto (colchón + sommier)</option>
                  </select>
                </Field>
                <Field label="Modelo" className="sm:col-span-2"
                  hint="Productos con el mismo modelo aparecen como “Otras medidas”. Ej.: diamante-deseo">
                  <input value={p.model || ''} onChange={(e) => set('model', e.target.value)} className={input} />
                </Field>
              </div>
            )}
          </Card>

          <Card title="Fotos">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {p.images.map((src, i) => (
                <div key={src + i} className="group relative aspect-square overflow-hidden rounded-xl bg-piedra-100">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-piedra-900/80 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">Principal</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-piedra-900/70 p-1.5">
                    <span className="flex gap-1">
                      <button type="button" onClick={() => moveImage(i, -1)} className="rounded-md bg-white/90 p-1" aria-label="Mover a la izquierda"><Icon name="chevronLeft" size={14} /></button>
                      <button type="button" onClick={() => moveImage(i, 1)} className="rounded-md bg-white/90 p-1" aria-label="Mover a la derecha"><Icon name="chevronRight" size={14} /></button>
                    </span>
                    <button type="button" onClick={() => set('images', p.images.filter((_, j) => j !== i))} className="rounded-md bg-white/90 p-1 text-red-700" aria-label="Quitar foto"><Icon name="trash" size={14} /></button>
                  </div>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-piedra-300 text-center text-xs font-semibold text-piedra-500 hover:border-madera-500 hover:text-madera-700">
                <Icon name="upload" size={24} />
                {uploading ? `Subiendo ${uploading}…` : 'Agregar fotos'}
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
              </label>
            </div>
            <p className="mt-3 text-xs text-piedra-500">Las fotos se achican automáticamente para que carguen rápido. La primera es la principal.</p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Precio">
            <Field label="Precio de lista publicado" hint="Vacío = se muestra “Consultar precio”">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-piedra-400">$</span>
                <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={`${input} pl-7`} />
              </div>
            </Field>
            <Field label="Oferta / Promoción predeterminada" className="mt-4" hint="Seleccioná una promoción para mostrar la badge en la foto y destacar el producto">
              <select
                value={p.offer || ''}
                onChange={(e) => {
                  const chosen = PROMO_OFFERS.find((o) => o.id === e.target.value) || PROMO_OFFERS[0]
                  setP((prev) => ({
                    ...prev,
                    offer: chosen.id,
                    offer_label: chosen.badge,
                    discount_pct: chosen.discountPct || prev.discount_pct,
                  }))
                }}
                className={input}
              >
                {PROMO_OFFERS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Descuento / oferta personalizada (%)" className="mt-4" hint="Opcional. Se muestra el precio anterior tachado.">
              <input type="number" min={0} max={90} value={p.discount_pct || ''} onChange={(e) => set('discount_pct', Number(e.target.value) || 0)} className={input} />
            </Field>

            {finalPrice != null && !Number.isNaN(finalPrice) && (
              <div className="mt-5 rounded-xl bg-piedra-50 p-4 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-piedra-500">Así se verá</p>
                <div className="mt-2 flex justify-between"><span>Precio de lista</span><strong>{formatPrice(finalPrice)}</strong></div>
                <div className="flex justify-between text-madera-700"><span>Efectivo ({settings.cashDiscountPct}% OFF)</span><strong>{formatPrice(cashPrice(finalPrice, settings))}</strong></div>
                {settings.plans.filter((pl) => pl.enabled).map((pl) => (
                  <div key={pl.id} className="mt-2 border-t border-piedra-200 pt-2">
                    <p className="font-semibold">{pl.name}</p>
                    {quotePlan(finalPrice, pl).map((q) => (
                      <div key={q.n} className="flex justify-between text-piedra-600">
                        <span>{q.n} cuotas</span><span>{formatPrice(q.perInstallment)} · total {formatPrice(q.total)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Estado y Visibilidad">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={p.available} onChange={(e) => set('available', e.target.checked)} className="mt-0.5 h-4 w-4 accent-piedra-800" />
              <span><span className="font-medium">Disponible</span><span className="block text-xs text-piedra-500">Si lo desmarcás, se muestra en gris como “No disponible” y no se puede agregar al pedido.</span></span>
            </label>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={p.featured} onChange={(e) => set('featured', e.target.checked)} className="mt-0.5 h-4 w-4 accent-piedra-800" />
              <span><span className="font-medium">Destacado</span><span className="block text-xs text-piedra-500">Aparece en “Productos destacados” del inicio.</span></span>
            </label>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm">
              <input type="checkbox" checked={Boolean(p.hidden)} onChange={(e) => set('hidden', e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-700" />
              <span>
                <span className="font-semibold text-red-900">No mostrar en la tienda (Oculto)</span>
                <span className="block text-xs text-red-700">El producto queda guardado solo acá en el panel admin (productos viejos o discontinuados), no aparece en absoluto para los clientes.</span>
              </span>
            </label>
          </Card>

          <Card title="Video de YouTube (opcional)">
            <Field label="Enlace del video propio" hint="Opcional. Si este producto tiene un video propio o demostración en YouTube (ej. https://youtu.be/...). Si lo dejás vacío, usa el video general de la tienda.">
              <input
                value={p.youtube_url || ''}
                onChange={(e) => set('youtube_url', e.target.value)}
                placeholder="https://youtu.be/..."
                className={input}
              />
            </Field>
          </Card>
        </div>
      </div>
    </form>
  )
}
