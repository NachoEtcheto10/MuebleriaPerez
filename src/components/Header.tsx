import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { CATEGORIES } from '../lib/catalog'
import { useCart, useStore } from '../lib/store'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { SearchBox } from './SearchBox'

function TopStrip() {
  const { settings } = useStore()
  const free = Math.max(0, ...settings.plans.filter((p) => p.enabled).flatMap((p) => p.installments.filter((i) => i.coef <= 1).map((i) => i.n)))
  const items = [
    { icon: 'cash', text: `${settings.cashDiscountPct || 20}% OFF en efectivo o transferencia` },
    { icon: 'card', text: free > 0 ? `Hasta ${free} cuotas sin interés` : 'Hasta 6 cuotas sin interés' },
    { icon: 'whatsapp', text: 'Armá tu pedido y envialo por WhatsApp' },
  ]
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
    }, 3200)
    return () => clearInterval(timer)
  }, [items.length])

  return (
    <div className="bg-piedra-900 text-[0.78rem] text-piedra-100">
      {/* Vista mobile: rotación continua deslizándose hacia la izquierda */}
      <div className="relative h-8 w-full overflow-hidden md:hidden">
        {items.map((it, i) => {
          let pos = 'translate-x-full opacity-0 pointer-events-none'
          if (i === currentIndex) {
            pos = 'translate-x-0 opacity-100 z-10'
          } else if ((i + 1) % items.length === currentIndex) {
            pos = '-translate-x-full opacity-0 pointer-events-none'
          }
          return (
            <div
              key={it.text}
              className={`absolute inset-0 flex items-center justify-center gap-2 px-3 text-[0.76rem] font-medium text-piedra-100 transition-all duration-500 ease-in-out ${pos}`}
            >
              <Icon name={it.icon} size={15} className="shrink-0 text-madera-300" />
              <span className="truncate">{it.text}</span>
            </div>
          )
        })}
      </div>

      {/* Vista escritorio: items alineados horizontalmente */}
      <div className="mx-auto hidden max-w-7xl items-center justify-center gap-8 overflow-hidden px-4 py-2 md:flex">
        {items.map((it) => (
          <span key={it.text} className="flex items-center gap-2 whitespace-nowrap">
            <Icon name={it.icon} size={15} className="text-madera-300" /> {it.text}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Header() {
  const cart = useCart()
  const [menu, setMenu] = useState(false)
  const [openCat, setOpenCat] = useState<string | null>(null)
  const location = useLocation()

  // Se excluye la categoría 'otros' del navbar
  const navCategories = CATEGORIES.filter((c) => c.slug !== 'otros')

  useEffect(() => {
    setMenu(false)
  }, [location])

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : ''
  }, [menu])

  return (
    <header className="sticky top-0 z-40 bg-white/95 shadow-[0_1px_0_rgba(38,34,32,.08)] backdrop-blur">
      <TopStrip />

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:gap-10 lg:py-4">
        <button type="button" onClick={() => setMenu(true)} className="-ml-1 rounded-lg p-2 lg:hidden" aria-label="Abrir menú">
          <Icon name="menu" size={24} />
        </button>
        <Logo className="mx-auto lg:mx-0" />
        <SearchBox className="hidden flex-1 lg:block" />
        <button type="button" onClick={() => cart.setOpen(true)} aria-label={`Ver carrito (${cart.count} productos)`}
          className="relative -mr-1 flex items-center gap-2 rounded-xl p-2 text-piedra-800 hover:bg-piedra-50 lg:px-3">
          <Icon name="cart" size={24} />
          <span className="hidden text-sm font-semibold lg:inline">Mi carrito</span>
          {cart.count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-madera-600 px-1 text-[0.7rem] font-bold text-white lg:static">
              {cart.count}
            </span>
          )}
        </button>
      </div>

      <div className="px-4 pb-3 lg:hidden">
        <SearchBox />
      </div>

      {/* Barra de categorías (escritorio) */}
      <nav className="hidden border-t border-piedra-100 bg-piedra-50 lg:block" aria-label="Categorías">
        <ul className="mx-auto flex max-w-7xl items-center justify-center gap-1 px-4">
          <li>
            <NavLink to="/tienda" end className={({ isActive }) =>
              `block px-4 py-3 text-[0.8rem] font-semibold uppercase tracking-wide ${isActive ? 'text-madera-700' : 'text-piedra-700 hover:text-madera-700'}`}>
              Tienda
            </NavLink>
          </li>
          {navCategories.map((c) => (
            <li key={c.slug}>
              <NavLink to={`/categoria/${c.slug}`} className={({ isActive }) =>
                `block px-4 py-3 text-[0.8rem] font-semibold uppercase tracking-wide ${isActive ? 'text-madera-700' : 'text-piedra-700 hover:text-madera-700'}`}>
                {c.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Menú lateral (celular) */}
      {createPortal(
        <div className={`fixed inset-0 z-50 lg:hidden ${menu ? '' : 'pointer-events-none'}`}>
          <div onClick={() => setMenu(false)} className={`absolute inset-0 bg-piedra-900/40 transition-opacity ${menu ? 'opacity-100' : 'opacity-0'}`} />
          <aside className={`absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${menu ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between border-b border-piedra-100 px-5 py-4">
              <Logo />
              <button type="button" onClick={() => setMenu(false)} className="rounded-lg p-2" aria-label="Cerrar menú">
                <Icon name="x" size={22} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3">
              <Link to="/tienda" className="block rounded-lg px-3 py-3 font-semibold">Ver toda la tienda</Link>
              {navCategories.map((c) => (
                <div key={c.slug} className="border-t border-piedra-100">
                  <div className="flex items-center">
                    <Link to={`/categoria/${c.slug}`} className="flex flex-1 items-center gap-3 px-3 py-3 font-medium">
                      <Icon name={c.icon} size={20} className="text-madera-600" /> {c.name}
                    </Link>
                    {c.subcategories.length > 0 && (
                      <button type="button" onClick={() => setOpenCat(openCat === c.slug ? null : c.slug)} className="p-3" aria-label={`Ver subcategorías de ${c.name}`}>
                        <Icon name="chevronDown" size={18} className={`transition ${openCat === c.slug ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  {openCat === c.slug && (
                    <div className="mb-2 ml-11 grid">
                      {c.subcategories.map((s) => (
                        <Link key={s.slug} to={`/categoria/${c.slug}/${s.slug}`} className="py-2 text-sm text-piedra-600">
                          {s.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </aside>
        </div>,
        document.body,
      )}
    </header>
  )
}
