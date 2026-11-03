import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { waLink } from '../lib/format'
import { useStore } from '../lib/store'

const input = 'mt-1 w-full rounded-xl border border-piedra-200 bg-white px-3 py-2.5 text-[16px] outline-none focus:border-madera-500 focus:ring-4 focus:ring-madera-100 sm:text-sm'

function InfoCard({ icon, title, children, href }: { icon: string; title: string; children: ReactNode; href?: string }) {
  const body = (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-madera-50 text-madera-600">
        <Icon name={icon} size={21} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wider text-piedra-400">{title}</span>
        <span className="mt-0.5 block break-words font-semibold text-piedra-900">{children}</span>
      </span>
    </>
  )
  const cls = 'flex items-center gap-4 rounded-2xl border border-piedra-200 bg-white p-4 transition'
  return href ? (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener" className={`${cls} hover:border-madera-300 hover:shadow-card`}>{body}</a>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function ContactPage() {
  const { settings } = useStore()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  const location = [settings.address, settings.city].filter(Boolean).join(', ')
  const canSend = !!(settings.whatsapp || settings.email)

  const send = (e: FormEvent) => {
    e.preventDefault()
    const text = [`¡Hola! Soy ${name.trim()}.`, message.trim(), phone.trim() && `Mi teléfono: ${phone.trim()}`].filter(Boolean).join('\n\n')
    if (settings.whatsapp) {
      window.open(waLink(settings.whatsapp, text), '_blank', 'noopener')
    } else if (settings.email) {
      window.location.href = `mailto:${settings.email}?subject=${encodeURIComponent('Consulta desde la web')}&body=${encodeURIComponent(text)}`
    }
  }

  return (
    <>
      <section className="bg-piedra-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-madera-300">Contacto</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">¿Hablamos?</h1>
          <p className="mt-3 max-w-xl text-piedra-300">
            Escribinos para consultar precios, medidas, colores o formas de pago. Te respondemos a la brevedad.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
        {/* Datos */}
        <div className="space-y-3">
          {settings.whatsapp && (
            <InfoCard icon="whatsapp" title="WhatsApp" href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}>
              +{settings.whatsapp.replace(/\D/g, '')}
            </InfoCard>
          )}
          {settings.email && (
            <InfoCard icon="mail" title="E-mail" href={`mailto:${settings.email}`}>{settings.email}</InfoCard>
          )}
          {location && (
            <InfoCard icon="pin" title="Dirección" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}>
              {location}
            </InfoCard>
          )}
          {settings.hours && <InfoCard icon="clock" title="Horarios">{settings.hours}</InfoCard>}
          {(settings.instagram || settings.facebook) && (
            <div className="flex gap-3 pt-1">
              {settings.instagram && (
                <a href={settings.instagram} target="_blank" rel="noopener"
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-piedra-200 bg-white p-3 font-semibold hover:border-madera-300">
                  <Icon name="instagram" size={20} className="text-madera-600" /> Instagram
                </a>
              )}
              {settings.facebook && (
                <a href={settings.facebook} target="_blank" rel="noopener"
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-piedra-200 bg-white p-3 font-semibold hover:border-madera-300">
                  <Icon name="facebook" size={20} className="text-madera-600" /> Facebook
                </a>
              )}
            </div>
          )}
          {!canSend && !location && !settings.hours && (
            <p className="rounded-2xl bg-piedra-100 p-4 text-sm text-piedra-600">
              Todavía no cargamos nuestros datos de contacto. Volvé a visitarnos pronto.
            </p>
          )}

          {location && (
            <div className="overflow-hidden rounded-2xl border border-piedra-200 bg-piedra-100">
              <iframe title="Ubicación del local" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`}
                className="block h-64 w-full border-0 sm:h-72" />
            </div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={send} className="h-fit rounded-3xl bg-white p-5 shadow-card sm:p-8">
          <h2 className="font-display text-xl font-bold sm:text-2xl">Envianos tu consulta</h2>
          <p className="mt-1 text-sm text-piedra-500">
            {settings.whatsapp ? 'Al enviar se abre WhatsApp con tu mensaje listo.' : settings.email ? 'Al enviar se abre tu correo con el mensaje listo.' : ''}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Nombre *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className={input} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Teléfono</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" className={input} />
            </label>
          </div>
          <label className="mt-4 block text-sm">
            <span className="font-medium">Consulta *</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5}
              placeholder="Ej.: Quería saber si tienen el placard de 6 puertas en color blanco." className={input} />
          </label>
          <button type="submit" disabled={!canSend}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-piedra-800 px-5 py-3.5 font-semibold text-white hover:bg-piedra-900 disabled:cursor-not-allowed disabled:bg-piedra-300">
            <Icon name={settings.whatsapp ? 'whatsapp' : 'mail'} size={19} />
            {settings.whatsapp ? 'Enviar por WhatsApp' : 'Enviar por e-mail'}
          </button>
        </form>
      </div>
    </>
  )
}
