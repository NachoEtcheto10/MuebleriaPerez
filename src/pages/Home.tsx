import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PlansSummary } from '../components/Financing'
import { Icon } from '../components/Icon'
import { ProductCarousel } from '../components/ProductCarousel'
import { CATEGORIES, categoryPhoto } from '../lib/catalog'
import { waLink } from '../lib/format'
import { useStore } from '../lib/store'

const inputClass = 'mt-1 w-full rounded-xl border border-piedra-200 bg-white px-3 py-2.5 text-[16px] outline-none focus:border-madera-500 focus:ring-4 focus:ring-madera-100 sm:text-sm'

/**
 * Tamaño de cada ambiente en la grilla tipo "bento".
 * Celular (2 columnas): el primero grande y, si sobra uno al final, ocupa todo el ancho.
 * Escritorio (4 columnas): el primero 2x2, el segundo ancho, dos chicos al lado,
 * y el resto en filas que siempre quedan completas.
 */
function bentoClass(i: number, n: number) {
  let mobile = ''
  if (i === 0) mobile = 'col-span-2 row-span-2'
  else if (i === n - 1 && (n - 1) % 2 === 1) mobile = 'col-span-2'

  let desktop = 'lg:col-span-1 lg:row-span-1'
  if (n >= 4) {
    if (i === 0) desktop = 'lg:col-span-2 lg:row-span-2'
    else if (i === 1) desktop = 'lg:col-span-2 lg:row-span-1'
    else if (i >= 4) {
      const rowStart = 4 + Math.floor((i - 4) / 4) * 4
      const inRow = Math.min(4, n - rowStart)
      const pos = i - rowStart
      const spans = inRow === 1 ? [4] : inRow === 2 ? [2, 2] : inRow === 3 ? [1, 1, 2] : [1, 1, 1, 1]
      desktop = `${['', 'lg:col-span-1', 'lg:col-span-2', '', 'lg:col-span-4'][spans[pos]]} lg:row-span-1`
    }
  } else if (i === 0) {
    desktop = 'lg:col-span-2 lg:row-span-2'
  } else {
    desktop = 'lg:col-span-2 lg:row-span-1'
  }
  return `${mobile} ${desktop}`
}

export function Home() {
  const { products, settings } = useStore()
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactMessage, setContactMessage] = useState('')

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of products) {
      if (!p.hidden) m.set(p.category, (m.get(p.category) || 0) + 1)
    }
    return m
  }, [products])

  const location = [settings.address, settings.city].filter(Boolean).join(', ')
  const storeMapQuery = `Pérez Muebles y Colchones, ${location || 'Bv. J. Sansoni 1932, Concepción del Uruguay, Entre Ríos'}`

  const rooms = useMemo(() => CATEGORIES.filter((c) => (counts.get(c.slug) || 0) > 0), [counts])

  const featured = useMemo(() => {
    const marked = products.filter((p) => p.featured && p.available && !p.hidden)
    if (marked.length) return marked.slice(0, 16)
    const picks: typeof products = []
    for (const c of CATEGORIES) {
      const p = products.find((x) => x.category === c.slug && x.available && !x.hidden && x.price_list != null && !picks.includes(x))
      if (p) picks.push(p)
    }
    for (const p of products) {
      if (picks.length >= 12) break
      if (p.available && !p.hidden && p.price_list != null && !picks.includes(p)) picks.push(p)
    }
    return picks
  }, [products])

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = [
      `¡Hola! Soy ${contactName.trim()}.`,
      contactMessage.trim(),
      contactPhone.trim() && `Mi teléfono: ${contactPhone.trim()}`,
    ]
      .filter(Boolean)
      .join('\n\n')

    if (settings.whatsapp) {
      window.open(waLink(settings.whatsapp, text), '_blank', 'noopener')
    } else if (settings.email) {
      window.location.href = `mailto:${settings.email}?subject=${encodeURIComponent('Consulta desde la web')}&body=${encodeURIComponent(text)}`
    }
  }

  return (
    <>
      {/* Portada */}
      <section className="relative overflow-hidden bg-piedra-900 text-white">
        <div className="absolute inset-0 opacity-[0.07]" aria-hidden="true"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 2px, transparent 2px 46px)' }} />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 text-center md:grid-cols-[1.3fr_1fr] md:gap-10 md:py-20 md:text-left">
          {/* Logo en alta definición: en celular arriba y centrado, en escritorio a la derecha */}
          <div className="flex justify-center md:order-last">
            <img
              src="/logo.png"
              onError={(e) => { e.currentTarget.src = '/logo-perez.png' }}
              alt="Pérez Muebles & Colchones"
              width={320}
              height={320}
              loading="eager"
              decoding="async"
              className="w-44 rounded-3xl bg-white p-4 object-contain shadow-2xl ring-1 ring-white/10 sm:w-56 md:w-80 aspect-square"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-madera-300">Muebles &amp; Colchones</p>
            <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-[1.1] sm:text-5xl md:mt-4">{settings.heroTitle}</h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-piedra-300 sm:text-lg md:mx-0 md:mt-5">{settings.heroText}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 md:mt-8 md:justify-start">
              <Link to="/tienda" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-piedra-900 hover:bg-crema-100">
                Ir a la tienda <Icon name="arrowRight" size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="border-b border-piedra-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-4 py-6 md:grid-cols-4">
          {[
            { icon: 'cash', title: `${settings.cashDiscountPct}% OFF`, text: 'en efectivo o transferencia' },
            { icon: 'card', title: 'Cuotas sin interés', text: 'Visa, Mastercard y Naranja' },
            { icon: 'whatsapp', title: 'Pedido por WhatsApp', text: 'armalo acá y envialo' },
            { icon: 'chat', title: 'Te asesoramos', text: 'antes y después de comprar' },
          ].map((b) => (
            <div key={b.title} className="flex items-center gap-3 px-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-madera-50 text-madera-600">
                <Icon name={b.icon} size={21} />
              </span>
              <span>
                <span className="block text-sm font-semibold">{b.title}</span>
                <span className="block text-xs text-piedra-500">{b.text}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Categorías */}
      <section className="mx-auto max-w-7xl px-4 pt-14">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Comprá por ambiente</h2>
        <div className="mt-6 grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[190px] sm:gap-4 lg:auto-rows-[210px] lg:grid-cols-4">
          {rooms.map((c, i) => {
            const big = i === 0
            return (
              <Link key={c.slug} to={`/categoria/${c.slug}`}
                className={`group relative isolate overflow-hidden rounded-3xl bg-piedra-200 shadow-card ${bentoClass(i, rooms.length)}`}>
                <img src={categoryPhoto(c, settings.categoryImages)} alt={c.name} loading="lazy" decoding="async"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                  className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-piedra-900/85 via-piedra-900/20 to-transparent" />
                <span className={`flex h-full flex-col justify-end text-white ${big ? 'p-5 sm:p-8' : 'p-4 sm:p-5'}`}>
                  <span className="flex items-center gap-2">
                    <Icon name={c.icon} size={big ? 24 : 20} className="hidden text-madera-300 sm:block" />
                    <span className={`font-display font-bold leading-tight ${big ? 'text-2xl sm:text-4xl' : 'text-base sm:text-xl'}`}>{c.name}</span>
                  </span>
                  <span className={`mt-1 flex items-center gap-1 text-white/80 ${big ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>
                    {counts.get(c.slug)} productos
                    <Icon name="arrowRight" size={big ? 17 : 14} className="transition group-hover:translate-x-1" />
                  </span>
                  {big && (
                    <span className="mt-4 hidden w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-piedra-900 transition group-hover:bg-crema-100 sm:inline-flex">
                      Ver {c.name.toLowerCase()} <Icon name="arrowRight" size={16} />
                    </span>
                  )}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Destacados */}
      <section className="mx-auto max-w-7xl px-4 pt-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Productos destacados</h2>
          <Link to="/tienda" className="shrink-0 text-sm font-semibold text-madera-700">Ver todo</Link>
        </div>
        <div className="mt-6">
          <ProductCarousel products={featured} autoplay={5000} />
        </div>
      </section>

      {/* Financiación */}
      <section className="mx-auto max-w-7xl px-4 pt-14">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Planes de financiación</h2>
        <p className="mt-2 text-piedra-600">Los precios publicados son de lista. Elegí cómo pagar al finalizar tu pedido.</p>
        <div className="mt-6">
          <PlansSummary />
        </div>
      </section>

      {/* Visitanos */}
      {location && (
        <section className="mx-auto max-w-7xl px-4 pt-14">
          <div className="grid overflow-hidden rounded-3xl bg-piedra-900 text-white shadow-card md:grid-cols-[1fr_1.25fr]">
            <div className="relative p-6 sm:p-10">
              <div className="absolute inset-0 opacity-[0.06]" aria-hidden="true"
                style={{ backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 2px, transparent 2px 46px)' }} />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-madera-300">Visitanos</p>
                <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Vení a conocer el local</h2>
                <p className="mt-2 text-piedra-300">Acercate a ver y probar nuestros muebles y colchones. Te asesoramos personalmente.</p>
                <ul className="mt-6 space-y-4">
                  <li className="flex gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-madera-300"><Icon name="pin" size={19} /></span>
                    <span>
                      <span className="block text-xs uppercase tracking-wider text-piedra-400">Dirección</span>
                      <span className="block font-semibold">{settings.address}</span>
                      {settings.city && <span className="block text-sm text-piedra-300">{settings.city}</span>}
                    </span>
                  </li>
                  {settings.hours && (
                    <li className="flex gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-madera-300"><Icon name="clock" size={19} /></span>
                      <span>
                        <span className="block text-xs uppercase tracking-wider text-piedra-400">Horarios</span>
                        <span className="block font-semibold">{settings.hours}</span>
                      </span>
                    </li>
                  )}
                </ul>
                <div className="mt-7 flex">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(storeMapQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-piedra-900 transition hover:bg-crema-100 sm:w-auto"
                  >
                    <Icon name="pin" size={17} /> Cómo llegar
                  </a>
                </div>
              </div>
            </div>
            <iframe
              title="Mapa: ubicación de la mueblería"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(storeMapQuery)}&t=&z=17&ie=UTF8&iwloc=&output=embed`}
              className="block h-72 w-full border-0 bg-piedra-800 sm:h-80 md:h-full md:min-h-[420px]"
            />
          </div>
        </section>
      )}

      {/* Sección Contacto (con redes sociales, horarios, WhatsApp, email y formulario) */}
      <section className="mx-auto max-w-7xl px-4 pt-14">
        <div className="grid gap-8 rounded-3xl border border-piedra-200 bg-white p-6 shadow-card sm:p-10 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
          {/* Información de contacto: WhatsApp, Horarios, E-mail y Redes Sociales */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-madera-600">Contacto directo</p>
            <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl text-piedra-900">¿Hablamos?</h2>
            <p className="mt-3 text-sm leading-relaxed text-piedra-600 sm:text-base">
              Escribinos para consultar precios, modelos en stock, colores, medidas especiales o formas de pago. Te asesoramos al instante.
            </p>

            <div className="mt-6 space-y-3.5">
              {settings.whatsapp && (
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-2xl border border-piedra-200 bg-piedra-50/70 p-4 transition hover:border-madera-400 hover:bg-white hover:shadow-card"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <Icon name="whatsapp" size={22} />
                  </span>
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-piedra-400">WhatsApp</span>
                    <span className="block font-semibold text-piedra-900">+{settings.whatsapp.replace(/\D/g, '')}</span>
                  </div>
                </a>
              )}

              {settings.hours && (
                <div className="flex items-center gap-4 rounded-2xl border border-piedra-200 bg-piedra-50/70 p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-madera-50 text-madera-600">
                    <Icon name="clock" size={21} />
                  </span>
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-piedra-400">Horarios de atención</span>
                    <span className="block text-sm font-semibold text-piedra-900">{settings.hours}</span>
                  </div>
                </div>
              )}

              {/* Card de E-mail (en reemplazo de la dirección física que está en Visitanos) */}
              <a
                href={`mailto:${settings.email || 'perezmueblesycolchones@gmail.com'}`}
                className="flex items-center gap-4 rounded-2xl border border-piedra-200 bg-piedra-50/70 p-4 transition hover:border-madera-400 hover:bg-white hover:shadow-card"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-madera-50 text-madera-600">
                  <Icon name="mail" size={21} />
                </span>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-piedra-400">E-mail</span>
                  <span className="block break-all text-sm font-semibold text-piedra-900">
                    {settings.email || 'perezmueblesycolchones@gmail.com'}
                  </span>
                </div>
              </a>

              {/* Redes sociales */}
              {(settings.instagram || settings.facebook) && (
                <div className="pt-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-piedra-400 mb-2.5">
                    Seguinos en redes
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {settings.instagram && (
                      <a
                        href={settings.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-xl border border-piedra-200 bg-white px-4 py-3 text-sm font-semibold text-piedra-800 transition hover:border-madera-500 hover:text-madera-700"
                      >
                        <Icon name="instagram" size={19} className="text-madera-600" /> Instagram
                      </a>
                    )}
                    {settings.facebook && (
                      <a
                        href={settings.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-xl border border-piedra-200 bg-white px-4 py-3 text-sm font-semibold text-piedra-800 transition hover:border-madera-500 hover:text-madera-700"
                      >
                        <Icon name="facebook" size={19} className="text-madera-600" /> Facebook
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Formulario de consulta */}
          <form onSubmit={handleContactSubmit} className="flex flex-col justify-between rounded-2xl bg-piedra-50 p-5 sm:p-7">
            <div>
              <h3 className="font-display text-xl font-bold text-piedra-900">Envianos tu mensaje</h3>
              <p className="mt-1 text-xs text-piedra-500">
                Al enviar se abrirá WhatsApp con el mensaje pre-cargado listo para enviar.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium text-piedra-800">Nombre *</span>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    placeholder="Tu nombre completo"
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-piedra-800">Teléfono</span>
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    type="tel"
                    placeholder="Ej.: 3442 123456"
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="mt-4 block text-sm">
                <span className="font-medium text-piedra-800">Consulta *</span>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="Hola, quería consultar disponibilidad, precio y entrega de..."
                  className={inputClass}
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-piedra-900 px-5 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-piedra-800 active:scale-[0.99]"
            >
              <Icon name="whatsapp" size={19} className="text-emerald-400" />
              Enviar consulta por WhatsApp
            </button>
          </form>
        </div>
      </section>
    </>
  )
}
