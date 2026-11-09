import { useStore } from '../lib/store'
import { Icon } from './Icon'
import { Logo } from './Logo'

export function Footer() {
  const { settings } = useStore()
  const location = [settings.address, settings.city].filter(Boolean).join(', ')
  const mapQuery = `Pérez Muebles y Colchones, ${location || 'Bv. J. Sansoni 1932, Concepción del Uruguay, Entre Ríos'}`

  return (
    <footer className="mt-20 border-t border-piedra-800 bg-piedra-900 text-piedra-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          {/* Marca, descripción y redes */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <Logo light />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-piedra-300">
              Muebles y colchones para cada ambiente de tu casa. Armá tu pedido online y coordiná el pago y envío directamente por WhatsApp.
            </p>

            {/* Redes sociales */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              {settings.instagram && (
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-madera-600 active:scale-95"
                >
                  <Icon name="instagram" size={18} />
                  <span>Instagram</span>
                </a>
              )}
              {settings.facebook && (
                <a
                  href={settings.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-madera-600 active:scale-95"
                >
                  <Icon name="facebook" size={18} />
                  <span>Facebook</span>
                </a>
              )}
              {settings.whatsapp && (
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600/20 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-600 hover:text-white active:scale-95"
                >
                  <Icon name="whatsapp" size={18} />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>

          {/* Contacto y datos del local */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-madera-300">
              Atención &amp; Ubicación
            </h3>
            <ul className="mt-4 space-y-3.5 text-sm">
              {location && (
                <li className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-madera-300">
                    <Icon name="pin" size={18} />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs uppercase tracking-wider text-piedra-400">Dirección</span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-white hover:text-madera-300"
                    >
                      {location}
                    </a>
                  </div>
                </li>
              )}
              {settings.hours && (
                <li className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-madera-300">
                    <Icon name="clock" size={18} />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs uppercase tracking-wider text-piedra-400">Horarios</span>
                    <span className="font-medium text-piedra-200">{settings.hours}</span>
                  </div>
                </li>
              )}
              {settings.whatsapp && (
                <li className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-madera-300">
                    <Icon name="whatsapp" size={18} />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs uppercase tracking-wider text-piedra-400">WhatsApp</span>
                    <a
                      href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-white hover:text-madera-300"
                    >
                      +{settings.whatsapp.replace(/\D/g, '')}
                    </a>
                  </div>
                </li>
              )}
              {settings.email && (
                <li className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-madera-300">
                    <Icon name="mail" size={18} />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs uppercase tracking-wider text-piedra-400">E-mail</span>
                    <a href={`mailto:${settings.email}`} className="break-all font-medium text-piedra-200 hover:text-white">
                      {settings.email}
                    </a>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="border-t border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-center text-xs text-piedra-400 sm:flex-row sm:text-left">
          <span>© {new Date().getFullYear()} Pérez Muebles &amp; Colchones. Todos los derechos reservados.</span>
          <div className="flex items-center gap-1.5 text-xs text-piedra-400">
            <span>Desarrollado por</span>
            <a
              href="https://www.instagram.com/sodalis.software/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-piedra-200 transition hover:border-madera-500/50 hover:bg-white/10 hover:text-white active:scale-95"
            >
              <Icon name="instagram" size={14} className="text-madera-400" />
              <span>Sodalis</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
