import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { backend } from '../../lib/backend'
import { formatPrice, slugify } from '../../lib/format'
import { quotePlan } from '../../lib/pricing'
import { useStore } from '../../lib/store'
import type { FinancingPlan, StoreSettings } from '../../lib/types'
import { useToast } from './AdminApp'

const num = (v: string) => Number(v.replace(',', '.'))

export function FinancingSettings() {
  const { settings, setSettings } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState<StoreSettings>(() => ({ ...settings, plans: settings.plans.filter((p) => p.id !== 'credito-personal') }))
  const [example, setExample] = useState(100000)
  const [busy, setBusy] = useState(false)

  useEffect(() => setDraft({ ...settings, plans: settings.plans.filter((p) => p.id !== 'credito-personal') }), [settings])

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)

  const setPlan = (i: number, plan: FinancingPlan) => setDraft({ ...draft, plans: draft.plans.map((p, j) => (j === i ? plan : p)) })

  const save = async () => {
    for (const p of draft.plans) {
      if (!p.name.trim()) return toast('Cada plan necesita un nombre', 'error')
      if (p.installments.some((i) => !(i.n >= 1) || !(i.coef > 0))) return toast(`Revisá las cuotas de ${p.name}`, 'error')
    }
    setBusy(true)
    try {
      await backend.saveSettings(draft)
      setSettings(draft)
      toast('Financiación guardada: los precios de toda la tienda ya están actualizados')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Planes de financiación</h1>
          <p className="max-w-2xl text-sm text-piedra-500">
            El precio de cada cuota se calcula como <strong>precio de lista × coeficiente ÷ cuotas</strong>.
            Coeficiente 1 = sin interés; 1,2 = 20% de recargo. Al guardar se actualizan los precios de todos los productos.
          </p>
        </div>
        <div className="flex gap-2">
          {dirty && <button type="button" onClick={() => setDraft(settings)} className="rounded-xl border border-piedra-200 bg-white px-4 py-2.5 text-sm font-semibold">Descartar</button>}
          <button type="button" onClick={save} disabled={!dirty || busy} className="rounded-xl bg-piedra-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <section className="flex flex-wrap items-center gap-6 rounded-2xl border border-piedra-200 bg-white p-5">
        <label className="text-sm">
          <span className="block font-display font-bold">Descuento en efectivo o transferencia</span>
          <span className="mt-2 flex items-center gap-2">
            <input type="number" min={0} max={90} step="0.5" value={draft.cashDiscountPct}
              onChange={(e) => setDraft({ ...draft, cashDiscountPct: num(e.target.value) || 0 })}
              className="w-24 rounded-xl border border-piedra-200 px-3 py-2 text-[16px] sm:text-sm" />
            <span className="font-semibold">%</span>
          </span>
        </label>
        <label className="text-sm">
          <span className="block font-medium text-piedra-500">Precio de ejemplo para la vista previa</span>
          <input type="number" min={0} step="1000" value={example} onChange={(e) => setExample(num(e.target.value) || 0)}
            className="mt-2 w-40 rounded-xl border border-piedra-200 px-3 py-2 text-[16px] sm:text-sm" />
        </label>
        <div className="ml-auto rounded-xl bg-madera-50 px-4 py-3 text-sm">
          <span className="text-piedra-600">Lista {formatPrice(example)} → efectivo </span>
          <strong className="text-madera-700">{formatPrice(example * (1 - draft.cashDiscountPct / 100))}</strong>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {draft.plans.map((plan, i) => (
          <section key={plan.id} className={`rounded-2xl border bg-white p-5 ${plan.enabled ? 'border-piedra-200' : 'border-dashed border-piedra-300 opacity-70'}`}>
            <div className="flex items-center gap-3">
              <input value={plan.name} onChange={(e) => setPlan(i, { ...plan, name: e.target.value })} aria-label="Nombre del plan"
                className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 font-display text-lg font-bold hover:border-piedra-200 focus:border-madera-500 focus:outline-none" />
              <label className="flex items-center gap-2 text-xs font-semibold text-piedra-600">
                <input type="checkbox" checked={plan.enabled} onChange={(e) => setPlan(i, { ...plan, enabled: e.target.checked })} className="h-4 w-4 accent-piedra-800" />
                Activo
              </label>
              <button type="button" onClick={() => confirm(`¿Eliminar el plan ${plan.name}?`) && setDraft({ ...draft, plans: draft.plans.filter((_, j) => j !== i) })}
                className="rounded-lg p-1.5 text-piedra-400 hover:bg-red-50 hover:text-red-700" aria-label={`Eliminar ${plan.name}`}>
                <Icon name="trash" size={17} />
              </button>
            </div>

            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-piedra-400">
                  <th className="pb-2 font-semibold">Cuotas</th>
                  <th className="pb-2 font-semibold">Coeficiente</th>
                  <th className="pb-2 text-right font-semibold">Cuota ({formatPrice(example)})</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plan.installments.map((inst, k) => {
                  const q = quotePlan(example, { ...plan, installments: [inst] })[0]
                  return (
                    <tr key={k} className="border-t border-piedra-100">
                      <td className="py-2 pr-2">
                        <input type="number" min={1} value={inst.n} aria-label="Cantidad de cuotas"
                          onChange={(e) => setPlan(i, { ...plan, installments: plan.installments.map((x, m) => (m === k ? { ...x, n: num(e.target.value) } : x)) })}
                          className="w-16 rounded-lg border border-piedra-200 px-2 py-1.5 text-[16px] sm:text-sm" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" min={0} step="0.01" value={inst.coef} aria-label="Coeficiente"
                          onChange={(e) => setPlan(i, { ...plan, installments: plan.installments.map((x, m) => (m === k ? { ...x, coef: num(e.target.value) } : x)) })}
                          className="w-20 rounded-lg border border-piedra-200 px-2 py-1.5 text-[16px] sm:text-sm" />
                      </td>
                      <td className="py-2 text-right">
                        {q ? (<><span className="font-semibold">{formatPrice(q.perInstallment, true)}</span><span className="block text-xs text-piedra-500">total {formatPrice(q.total)}</span></>) : '—'}
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <button type="button" onClick={() => setPlan(i, { ...plan, installments: plan.installments.filter((_, m) => m !== k) })}
                          className="rounded-md p-1 text-piedra-400 hover:text-red-700" aria-label="Quitar opción de cuotas">
                          <Icon name="x" size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button type="button" onClick={() => setPlan(i, { ...plan, installments: [...plan.installments, { n: 18, coef: 1 }] })}
              className="mt-3 flex items-center gap-1 text-sm font-semibold text-madera-700">
              <Icon name="plus" size={16} /> Agregar cuotas
            </button>
          </section>
        ))}

        <button type="button"
          onClick={() => {
            let id = 'nuevo-plan'
            for (let n = 2; draft.plans.some((p) => p.id === id); n++) id = `nuevo-plan-${n}`
            setDraft({ ...draft, plans: [...draft.plans, { id: slugify(id), name: 'Nuevo plan', enabled: true, installments: [{ n: 3, coef: 1 }] }] })
          }}
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-piedra-300 text-sm font-semibold text-piedra-500 hover:border-madera-500 hover:text-madera-700">
          <Icon name="plus" size={24} /> Agregar plan (tarjeta o crédito)
        </button>
      </div>
    </div>
  )
}
