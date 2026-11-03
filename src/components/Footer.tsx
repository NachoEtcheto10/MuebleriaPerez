import { Link } from 'react-router-dom'
import { CATEGORIES } from '../lib/catalog'
import { useStore } from '../lib/store'
import { Icon } from './Icon'
import { Logo } from './Logo'

export function Footer() {
  const { settings } = useStore()
  return (
    <footer className="mt-20 bg-piedra-900 text-piedra-200">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm text-piedra-300">
            Muebles y colchones para cada ambiente de tu casa. Armá tu pedido online y coordinalo por WhatsApp.
          </p>
          <div className="mt-5 flex gap-2">
            {settings.instagram && (
              <a href={settings.instagram} target="_blank" rel="noopener" aria-label="Instagram"
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 hover:bg-madera-600">
                <Icon name="instagram" size={20} />
              </a>
            )}
            {settings.facebook && (
              <a href={settings.facebook} target="_blank" rel="noopener" aria-label="Facebook"
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 hover:bg-madera-600">
                <Icon name="facebook" size={20} />
              </a>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">Categorías</h3>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link to={`/categoria/${c.slug}`} className="hover:text-white">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">Formas de pago</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>Efectivo o transferencia: {settings.cashDiscountPct}% OFF</li>
            {settings.plans.filter((p) => p.enabled).map((p) => (
              <li key={p.id}>{p.name}: {p.installments.map((i) => i.n).sort((a, b) => a - b).join(', ')} cuotas</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">Contacto</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {(settings.address || settings.city) && (
              <li className="flex gap-2"><Icon name="pin" size={18} className="mt-0.5 shrink-0 text-madera-300" />{[settings.address, settings.city].filter(Boolean).join(', ')}</li>
            )}
            {settings.hours && (
              <li className="flex gap-2"><Icon name="clock" size={18} className="mt-0.5 shrink-0 text-madera-300" />{settings.hours}</li>
            )}
            {settings.whatsapp && (
              <li className="flex gap-2"><Icon name="whatsapp" size={18} className="mt-0.5 shrink-0 text-madera-300" />
                <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="hover:text-white">{settings.whatsapp}</a>
              </li>
            )}
            {settings.email && (
              <li className="flex gap-2"><Icon name="mail" size={18} className="mt-0.5 shrink-0 text-madera-300" />
                <a href={`mailto:${settings.email}`} className="break-all hover:text-white">{settings.email}</a>
              </li>
            )}
            <li>
              <Link to="/contacto" className="inline-flex items-center gap-1 font-semibold text-white hover:text-madera-300">
                Ir a contacto <Icon name="arrowRight" size={15} />
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-piedra-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Pérez Muebles &amp; Colchones</span>
          <Link to="/admin" className="hover:text-piedra-200">Administración</Link>
        </div>
      </div>
    </footer>
  )
}
