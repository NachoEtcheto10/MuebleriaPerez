import { useState } from 'react'
import { formatPrice } from '../lib/format'
import { cashPrice, quotePlan } from '../lib/pricing'
import { useStore } from '../lib/store'
import { Icon } from './Icon'

/** Planes de financiación de un precio: efectivo y cuotas por tarjeta/crédito */
export function FinancingTable({ price }: { price: number }) {
  const { settings } = useStore()
  const plans = settings.plans.filter((p) => p.enabled && p.installments.length)
  const [planId, setPlanId] = useState(plans[0]?.id)
  const plan = plans.find((p) => p.id === planId) || plans[0]

  return (
    <section className="rounded-2xl border border-piedra-200 bg-white">
      <div className="flex items-center gap-3 border-b border-piedra-100 px-5 py-4">
        <Icon name="card" size={20} className="text-madera-600" />
        <h2 className="font-display font-bold">Planes de financiación</h2>
      </div>

      <div className="flex items-center justify-between gap-4 bg-madera-50 px-5 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-piedra-700">
          <Icon name="cash" size={18} className="text-madera-600" /> Efectivo o transferencia
          <span className="whitespace-nowrap rounded-full bg-madera-600 px-2 py-0.5 text-[0.7rem] font-bold text-white">{settings.cashDiscountPct}% OFF</span>
        </span>
        <span className="font-display text-lg font-bold text-madera-700">{formatPrice(cashPrice(price, settings))}</span>
      </div>

      {plan && (
        <>
          <div className="flex gap-2 overflow-x-auto px-5 pt-4" role="tablist">
            {plans.map((p) => (
              <button key={p.id} type="button" role="tab" aria-selected={p.id === plan.id} onClick={() => setPlanId(p.id)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${p.id === plan.id ? 'bg-piedra-800 text-white' : 'bg-piedra-100 text-piedra-700 hover:bg-piedra-200'}`}>
                {p.name}
              </button>
            ))}
          </div>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-piedra-400">
                <th className="px-5 py-2 font-semibold">Cuotas</th>
                <th className="px-2 py-2 text-right font-semibold">Valor cuota</th>
                <th className="px-5 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {quotePlan(price, plan).map((q) => (
                <tr key={q.n} className="border-t border-piedra-100">
                  <td className="px-5 py-2.5">
                    <span className="font-semibold">{q.n} cuotas</span>
                    {q.interestFree && <span className="block text-xs font-semibold text-madera-700 sm:ml-2 sm:inline">sin interés</span>}
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold">{formatPrice(q.perInstallment, true)}</td>
                  <td className="px-5 py-2.5 text-right text-piedra-500">{formatPrice(q.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}

/** Resumen de los planes para el inicio */
export function PlansSummary() {
  const { settings } = useStore()
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-2xl bg-piedra-900 p-5 text-white">
        <Icon name="cash" size={26} className="text-madera-300" />
        <p className="mt-3 font-display text-3xl font-extrabold">{settings.cashDiscountPct}% OFF</p>
        <p className="mt-1 text-sm text-piedra-300">Pagando en efectivo o transferencia</p>
      </div>
      {settings.plans.filter((p) => p.enabled).map((p) => (
        <div key={p.id} className="rounded-2xl border border-piedra-200 bg-white p-5">
          <p className="font-display font-bold">{p.name}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {[...p.installments].sort((a, b) => a.n - b.n).map((i) => (
              <li key={i.n} className="flex items-center justify-between gap-2">
                <span>{i.n} cuotas</span>
                <span className={i.coef <= 1 ? 'font-semibold text-madera-700' : 'text-piedra-500'}>
                  {i.coef <= 1 ? 'sin interés' : `+${Math.round((i.coef - 1) * 100)}%`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
