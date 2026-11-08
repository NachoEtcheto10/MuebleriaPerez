import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QtyControl } from '../components/CartDrawer'
import { Icon } from '../components/Icon'
import { ProductImage } from '../components/ProductImage'
import { formatPrice, waLink } from '../lib/format'
import { orderLines, orderMessage, orderTotals } from '../lib/order'
import { paymentOptions } from '../lib/pricing'
import { useCart, useStore } from '../lib/store'

export function OrderPage() {
  const cart = useCart()
  const { byId, settings } = useStore()
  const lines = orderLines(cart.items, byId)
  const options = useMemo(() => paymentOptions(settings), [settings])
  const [optionId, setOptionId] = useState('efectivo')
  const [customer, setCustomer] = useState({ name: '', city: '', notes: '' })
  const [sent, setSent] = useState(false)
  const option = options.find((o) => o.id === optionId) || options[0]
  const totals = orderTotals(lines, option)
  const base = orderTotals(lines)

  if (lines.length === 0 && !sent) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Icon name="cart" size={48} strokeWidth={1.3} className="mx-auto text-piedra-300" />
        <h1 className="mt-4 font-display text-2xl font-bold">Tu carrito está vacío</h1>
        <Link to="/tienda" className="mt-4 inline-block font-semibold text-madera-700">Ir a la tienda</Link>
      </div>
    )
  }

  const send = () => {
    const text = orderMessage(lines, option, customer)
    window.open(waLink(settings.whatsapp, text), '_blank', 'noopener')
    setSent(true)
  }

  // Agrupa las opciones: efectivo, cada plan y precio de lista
  const groups: { title: string; items: typeof options }[] = [{ title: 'Contado', items: options.filter((o) => o.id === 'efectivo' || o.id === 'lista') }]
  for (const plan of settings.plans.filter((p) => p.enabled && p.id !== 'credito-personal')) {
    groups.push({ title: plan.name, items: options.filter((o) => o.id.startsWith(plan.id + '-')) })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Finalizar pedido</h1>
      <p className="mt-1 text-piedra-600">Revisá tu pedido, elegí cómo pagar y envialo por WhatsApp. Te respondemos para coordinar la entrega.</p>

      {sent && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-madera-300 bg-madera-50 p-4">
          <p className="flex items-center gap-2 font-medium text-madera-700"><Icon name="check" size={20} /> ¡Listo! Se abrió WhatsApp con tu pedido. Solo falta tocar “Enviar”.</p>
          {lines.length > 0 && (
            <button type="button" onClick={() => cart.clear()} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-piedra-700">Vaciar pedido</button>
          )}
        </div>
      )}

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          {/* Productos */}
          <section className="rounded-2xl bg-white shadow-card">
            <h2 className="border-b border-piedra-100 px-5 py-4 font-display font-bold">Productos</h2>
            <ul className="divide-y divide-piedra-100">
              {lines.map((l, i) => (
                <li key={`${l.item.id}-${l.item.color}`} className="flex gap-4 px-5 py-4">
                  <ProductImage product={l.product} badge={false} className="h-20 w-24 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/producto/${l.product.id}`} className="font-medium leading-snug">{l.product.name}</Link>
                    {l.product.colors.length > 1 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-piedra-600">
                          Color: {l.item.color ? <strong className="text-madera-700">{l.item.color}</strong> : <span className="text-piedra-400 font-normal">Opcional: elegí una terminación</span>}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {l.product.colors.map((c) => {
                            const isChosen = l.item.color === c
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => cart.setColor(i, isChosen ? '' : c)}
                                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                                  isChosen
                                    ? 'border-piedra-900 bg-piedra-900 text-white font-semibold shadow-sm'
                                    : 'border-piedra-200 bg-white text-piedra-700 hover:border-piedra-400'
                                }`}
                              >
                                {c}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <QtyControl value={l.item.qty} onChange={(n) => cart.update(i, n)} />
                      <span className="font-semibold">{l.unit != null ? formatPrice(l.unit * l.item.qty) : 'Consultar'}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => cart.remove(i)} className="self-start p-1 text-piedra-400 hover:text-piedra-800" aria-label="Quitar">
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Forma de pago */}
          <section className="rounded-2xl bg-white shadow-card">
            <h2 className="border-b border-piedra-100 px-5 py-4 font-display font-bold">¿Cómo querés pagar?</h2>
            <div className="space-y-5 p-5">
              {groups.filter((g) => g.items.length).map((g) => (
                <fieldset key={g.title}>
                  <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-piedra-500">{g.title}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g.items.map((o) => {
                      const total = base.list * o.factor
                      return (
                        <label key={o.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${optionId === o.id ? 'border-piedra-800 bg-piedra-50 ring-1 ring-piedra-800' : 'border-piedra-200 hover:border-piedra-400'}`}>
                          <input type="radio" name="pago" value={o.id} checked={optionId === o.id} onChange={() => setOptionId(o.id)} className="mt-1 accent-piedra-800" />
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="flex flex-wrap items-center gap-1.5 font-semibold">
                              <span>{o.id === 'efectivo' ? `Efectivo o transferencia` : o.id === 'lista' ? 'Precio de lista' : `${o.n} cuotas`}</span>
                              {o.id === 'efectivo' && (
                                <span className="inline-flex shrink-0 items-center rounded-full bg-madera-600 px-2 py-0.5 text-[0.68rem] font-bold text-white shadow-xs">
                                  {settings.cashDiscountPct}% OFF
                                </span>
                              )}
                              {o.n > 1 && o.factor <= 1 && (
                                <span className="shrink-0 text-xs font-semibold text-madera-700">sin interés</span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-piedra-500">
                              {o.n > 1 ? `${o.n} x ${formatPrice(total / o.n)} · total ${formatPrice(total)}` : formatPrice(total)}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>
        </div>

        {/* Resumen */}
        <aside className="lg:sticky lg:top-40 lg:self-start">
          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="font-display font-bold">Tus datos</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="font-medium">Nombre y apellido</span>
                <input
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Ej.: Juan Pérez"
                  autoComplete="name"
                  className="mt-1 w-full rounded-xl border border-piedra-200 px-3 py-2.5 text-[16px] outline-none focus:border-madera-500 sm:text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Localidad</span>
                <input
                  value={customer.city}
                  onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                  placeholder="Ej.: Concepción del Uruguay, Entre Ríos"
                  autoComplete="address-level2"
                  className="mt-1 w-full rounded-xl border border-piedra-200 px-3 py-2.5 text-[16px] outline-none focus:border-madera-500 sm:text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Comentarios <span className="font-normal text-piedra-400">(opcional)</span></span>
                <textarea
                  value={customer.notes}
                  onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                  rows={2}
                  placeholder="Ej.: Entregar por la tarde / Timbre 2B / Aclaraciones sobre la entrega"
                  className="mt-1 w-full rounded-xl border border-piedra-200 px-3 py-2.5 text-[16px] outline-none focus:border-madera-500 sm:text-sm"
                />
              </label>
            </div>

            <div className="mt-5 space-y-1.5 border-t border-piedra-100 pt-4 text-sm">
              <div className="flex justify-between"><span className="text-piedra-500">Precio de lista</span><span>{formatPrice(base.list)}</span></div>
              <div className="flex justify-between"><span className="text-piedra-500">Forma de pago</span><span className="text-right">{option.label}</span></div>
              <div className="flex items-baseline justify-between pt-2">
                <span className="font-semibold">Total</span>
                <span className="font-display text-2xl font-extrabold">{formatPrice(totals.total)}</span>
              </div>
              {totals.perInstallment && (
                <p className="text-right text-piedra-600">{option.n} cuotas de {formatPrice(totals.perInstallment, true)}</p>
              )}
              {totals.pending && <p className="pt-1 text-xs text-piedra-500">Hay productos con precio a consultar: te lo confirmamos por WhatsApp.</p>}
            </div>

            {lines.some((l) => l.product.colors.length > 1 && !l.item.color) && (
              <p className="mt-4 rounded-xl bg-madera-50 p-3 text-sm text-madera-700">
                Te falta elegir el color de algún producto. Si lo enviás así, lo confirmamos por WhatsApp.
              </p>
            )}
            {settings.whatsapp ? (
              <button type="button" onClick={send}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1fae55] px-5 py-3.5 font-semibold text-white hover:bg-[#189748]">
                <Icon name="whatsapp" size={21} /> Enviar pedido por WhatsApp
              </button>
            ) : (
              <p className="mt-5 rounded-xl bg-piedra-100 p-3 text-sm text-piedra-600">
                Falta configurar el número de WhatsApp de la tienda (Administración → Datos de la tienda).
              </p>
            )}
            <p className="mt-3 text-center text-xs text-piedra-500">No se cobra nada online: coordinamos el pago y la entrega por WhatsApp.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}
