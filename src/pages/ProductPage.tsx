import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QtyControl } from '../components/CartDrawer'
import { FinancingTable } from '../components/Financing'
import { Icon } from '../components/Icon'
import { ProductCarousel } from '../components/ProductCarousel'
import { ProductImage } from '../components/ProductImage'
import { YouTubeEmbed } from '../components/YouTubeEmbed'
import { SIZES, getCategory, getSubcategory } from '../lib/catalog'
import { formatPrice, waLink } from '../lib/format'
import { bestInterestFree, cashPrice, listPrice } from '../lib/pricing'
import { useCart, useStore } from '../lib/store'
import type { Product } from '../lib/types'

function related(product: Product, products: Product[]) {
  const others = products.filter((p) => p.id !== product.id && p.available && (!product.model || p.model !== product.model))
  const sameSub = others.filter((p) => p.category === product.category && p.subcategory === product.subcategory)
  const sameCat = others.filter((p) => p.category === product.category && p.subcategory !== product.subcategory)
  return [...sameSub, ...sameCat].slice(0, 8)
}

export function ProductPage() {
  const { id } = useParams()
  const { byId, products, settings, loading } = useStore()
  const cart = useCart()
  const product = id ? byId.get(id) : undefined
  const [img, setImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [color, setColor] = useState<string | undefined>()
  const [added, setAdded] = useState(false)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    setImg(0)
    setQty(1)
    setColor(product?.colors.length === 1 ? product.colors[0] : undefined)
    window.scrollTo({ top: 0 })

    if (product) {
      document.title = `${product.name} | Pérez Muebles & Colchones`

      // Meta description dinámica para SEO
      const metaDesc = document.querySelector('meta[name="description"]')
      const prevDesc = metaDesc?.getAttribute('content') || ''
      if (metaDesc) {
        metaDesc.setAttribute(
          'content',
          product.description ||
            `${product.name} en Pérez Muebles & Colchones. Consultá cuotas sin interés y descuento en efectivo en Concepción del Uruguay.`
        )
      }

      // Schema.org Product JSON-LD dinámico para Google Rich Snippets
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.id = 'product-schema-jsonld'
      const productPrice = listPrice(product)
      const schemaData = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description || product.name,
        sku: product.code || product.id,
        image: product.images.length > 0 ? product.images : ['https://www.perezmueblesycolchones.com.ar/logo.png'],
        brand: {
          '@type': 'Brand',
          name: product.brand || 'Pérez Muebles',
        },
        offers: {
          '@type': 'Offer',
          url: window.location.href,
          priceCurrency: 'ARS',
          price: productPrice != null ? productPrice : 0,
          availability: product.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: 'Pérez Muebles & Colchones',
          },
        },
      }
      script.text = JSON.stringify(schemaData)
      document.head.appendChild(script)

      return () => {
        document.title = 'Pérez Muebles & Colchones | Tienda Online en Concepción del Uruguay'
        if (metaDesc && prevDesc) metaDesc.setAttribute('content', prevDesc)
        const oldScript = document.getElementById('product-schema-jsonld')
        if (oldScript) oldScript.remove()
      }
    }
  }, [product])

  // El mismo modelo en otras medidas (colchones, conjuntos y sommiers)
  const variants = useMemo(() => {
    if (!product?.model) return []
    return products
      .filter((p) => p.model === product.model && p.subcategory === product.subcategory)
      .sort((a, b) => SIZES.indexOf(a.size || '') - SIZES.indexOf(b.size || '') || (a.measure || '').localeCompare(b.measure || ''))
  }, [product, products])

  const relatedList = useMemo(() => (product ? related(product, products) : []), [product, products])

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-piedra-500">Cargando…</div>
  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">No encontramos este producto</h1>
        <Link to="/tienda" className="mt-4 inline-block font-semibold text-madera-700">Volver a la tienda</Link>
      </div>
    )
  }

  const category = getCategory(product.category)
  const subcategory = getSubcategory(product.category, product.subcategory)
  const price = listPrice(product)
  const best = price != null ? bestInterestFree(price, settings) : null

  const total = product.images.length
  const go = (dir: -1 | 1) => setImg((i) => (i + dir + total) % total)

  const addToCart = () => {
    cart.add(product.id, qty, color)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const askText = `¡Hola! Quería consultar por ${product.name} (cód. ${product.code})${color ? `, en color ${color}` : ''}.`

  const specs = [
    product.measure && ['Medida', product.measure + ' cm'],
    product.size && ['Tamaño', product.size],
    product.material && ['Tipo', product.material === 'resortes' ? 'Resortes' : 'Espuma'],
    product.kind && ['Presentación', product.kind === 'conjunto' ? 'Conjunto (colchón + sommier)' : 'Solo colchón'],
    product.brand && ['Marca', product.brand],
  ].filter(Boolean) as [string, string][]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-piedra-500" aria-label="Ubicación">
        <Link to="/" className="hover:text-piedra-800">Inicio</Link>
        {category && (<><Icon name="chevronRight" size={14} /><Link to={`/categoria/${category.slug}`} className="hover:text-piedra-800">{category.name}</Link></>)}
        {subcategory && (<><Icon name="chevronRight" size={14} /><Link to={`/categoria/${category?.slug}/${subcategory.slug}`} className="hover:text-piedra-800">{subcategory.name}</Link></>)}
      </nav>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        {/* Fotos */}
        <div>
          <div className="relative"
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
            onTouchEnd={(e) => {
              if (touchX.current == null) return
              const dx = e.changedTouches[0].clientX - touchX.current
              touchX.current = null
              if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
            }}>
            <ProductImage product={product} index={img} className="aspect-[4/3] rounded-3xl" />
            {total > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Foto anterior"
                  className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-piedra-800 shadow-card hover:bg-white">
                  <Icon name="chevronLeft" size={22} />
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Foto siguiente"
                  className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-piedra-800 shadow-card hover:bg-white">
                  <Icon name="chevronRight" size={22} />
                </button>
                <span className="absolute bottom-3 right-3 rounded-full bg-piedra-900/70 px-2.5 py-1 text-xs font-semibold text-white">
                  {img + 1} / {total}
                </span>
              </>
            )}
          </div>
          {/* Miniaturas: otras perspectivas del producto. Siempre se muestran al menos 4 lugares;
              los que todavía no tienen foto quedan como "próximamente" hasta cargarlas en Administración */}
          <div className="mt-2 grid grid-cols-4 gap-2 p-1 sm:gap-3">
            {Array.from({ length: Math.max(4, total) }, (_, i) => {
              const src = product.images[i]
              if (!src) {
                return (
                  <div key={`vacia-${i}`} aria-hidden="true"
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-piedra-100 to-crema-200 text-piedra-300">
                    <Icon name={category?.icon || 'otros'} size={22} strokeWidth={1.3} />
                    <span className="hidden text-[0.6rem] font-medium uppercase tracking-wider sm:block">Próximamente</span>
                  </div>
                )
              }
              return (
                <button key={src + i} type="button" onClick={() => setImg(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === img}
                  className={`aspect-square overflow-hidden rounded-xl bg-piedra-100 ring-2 ring-offset-2 transition ${i === img ? 'ring-piedra-800' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
                  <img src={src} alt="" loading="lazy" className={`h-full w-full object-cover ${!product.available ? 'grayscale' : ''}`} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Datos */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-piedra-400">
            {product.brand || subcategory?.name || category?.name}
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">{product.name}</h1>
          {product.offer_label && (
            <div className="mt-2.5 inline-flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-1.5 text-xs font-bold text-red-700 shadow-xs">
              <span>🔥</span>
              <span>Promoción activa: {product.offer_label}</span>
            </div>
          )}
          {!product.available && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-piedra-100 px-3 py-1 text-sm font-semibold text-piedra-600">
              <Icon name="info" size={16} /> Producto no disponible por el momento
            </p>
          )}

          <div className="mt-5 rounded-2xl bg-white p-5 shadow-card">
            {price == null ? (
              <p className="font-display text-2xl font-bold">Consultar precio</p>
            ) : (
              <>
                {product.discount_pct > 0 && product.price_list != null && (
                  <p className="text-sm text-piedra-400"><span className="line-through">{formatPrice(product.price_list)}</span> <span className="font-semibold text-madera-700">{Math.round(product.discount_pct)}% OFF</span></p>
                )}
                <p className="text-xs font-semibold uppercase tracking-wide text-piedra-500">Precio de lista</p>
                <p className="font-display text-3xl font-extrabold">{formatPrice(price)}</p>
                <p className="mt-2 text-lg font-bold text-madera-700">
                  {formatPrice(cashPrice(price, settings))}{' '}
                  <span className="text-sm font-medium text-piedra-500">en efectivo o transferencia ({settings.cashDiscountPct}% OFF)</span>
                </p>
                {best && (
                  <p className="mt-1 text-sm text-piedra-600">
                    o {best.n} cuotas sin interés de <strong>{formatPrice(best.perInstallment)}</strong> con {best.planName}
                  </p>
                )}
              </>
            )}
          </div>

          {variants.length > 1 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold">Otras medidas</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {variants.map((v) => (
                  <Link key={v.id} to={`/producto/${v.id}`} replace
                    className={`rounded-xl border px-3 py-2 text-sm ${v.id === product.id ? 'border-piedra-800 bg-piedra-800 text-white' : 'border-piedra-200 bg-white hover:border-piedra-500'} ${!v.available ? 'opacity-50' : ''}`}>
                    <span className="block font-semibold">{v.size || v.measure}</span>
                    {v.measure && <span className="block text-xs opacity-75">{v.measure}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {product.colors.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Elegí el color: <span className="font-bold text-madera-700">{color || 'Sin seleccionar'}</span>
                </h2>
                {color && (
                  <button type="button" onClick={() => setColor(undefined)} className="text-xs font-medium text-piedra-500 hover:text-piedra-800">
                    Deseleccionar
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((c) => {
                  const active = color === c
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(active ? undefined : c)}
                      aria-pressed={active}
                      className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                        active
                          ? 'border-piedra-900 bg-piedra-900 text-white shadow-sm ring-2 ring-piedra-900 ring-offset-1'
                          : 'border-piedra-200 bg-white text-piedra-700 hover:border-piedra-400 hover:bg-piedra-50'
                      }`}
                    >
                      {active && <Icon name="check" size={14} />}
                      <span>{c}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-1.5 text-xs text-piedra-500">
                Al seleccionar un color se incluye automáticamente en tu pedido o consulta de WhatsApp.
              </p>
            </div>
          )}

          {product.available ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <QtyControl value={qty} onChange={(n) => setQty(Math.max(1, n))} />
              <button type="button" onClick={addToCart}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-piedra-800 px-5 py-3.5 font-semibold text-white hover:bg-piedra-900 disabled:cursor-not-allowed disabled:bg-piedra-300">
                <Icon name={added ? 'check' : 'cart'} size={19} />
                {added ? 'Agregado' : 'Agregar al carrito'}
              </button>
            </div>
          ) : null}
          {settings.whatsapp && (
            <a href={waLink(settings.whatsapp, askText)} target="_blank" rel="noopener"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-piedra-300 bg-white px-5 py-3 font-semibold text-piedra-800 hover:border-piedra-800">
              <Icon name="whatsapp" size={19} className="text-[#25d366]" /> Consultar por WhatsApp
            </a>
          )}

          {(product.description || specs.length > 0) && (
            <div className="mt-8">
              {product.description && <p className="whitespace-pre-line text-piedra-700">{product.description}</p>}
              {specs.length > 0 && (
                <dl className="mt-4 divide-y divide-piedra-200 rounded-2xl border border-piedra-200 bg-white text-sm">
                  {specs.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                      <dt className="text-piedra-500">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          {price != null && (
            <div className="mt-8">
              <FinancingTable price={price} />
            </div>
          )}
        </div>
      </div>

      {/* Video de YouTube de la tienda o del producto */}
      {(product.youtube_url || settings.youtubeUrl) && (
        <section className="mt-14">
          <YouTubeEmbed
            url={product.youtube_url || settings.youtubeUrl}
            title={product.youtube_url ? `Conocé en video: ${product.name}` : 'Conocé nuestros productos en acción'}
            subtitle={product.youtube_url ? 'Mirá los detalles, materiales y calidad de terminación.' : 'Mirá las novedades, armado y calidad en nuestro canal oficial.'}
          />
        </section>
      )}

      {relatedList.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold">También te puede interesar</h2>
          <div className="mt-6">
            <ProductCarousel products={relatedList} />
          </div>
        </section>
      )}
    </div>
  )
}
