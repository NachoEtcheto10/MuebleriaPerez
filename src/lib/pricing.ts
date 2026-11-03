import type { FinancingPlan, Product, StoreSettings } from './types'

/** Precio de lista final del producto (aplica la oferta propia si tiene) */
export function listPrice(p: Product): number | null {
  if (p.price_list == null) return null
  const d = Math.min(Math.max(p.discount_pct || 0, 0), 100)
  return p.price_list * (1 - d / 100)
}

/** Precio pagando en efectivo o transferencia */
export function cashPrice(price: number, settings: StoreSettings) {
  return price * (1 - settings.cashDiscountPct / 100)
}

export interface InstallmentQuote {
  planId: string
  planName: string
  n: number
  coef: number
  total: number
  perInstallment: number
  interestFree: boolean
}

export function quotePlan(price: number, plan: FinancingPlan): InstallmentQuote[] {
  return plan.installments
    .filter((i) => i.n > 0 && i.coef > 0)
    .sort((a, b) => a.n - b.n)
    .map((i) => {
      const total = price * i.coef
      return {
        planId: plan.id, planName: plan.name, n: i.n, coef: i.coef,
        total, perInstallment: total / i.n, interestFree: i.coef <= 1,
      }
    })
}

/** La mejor opción de cuotas sin interés (la de más cuotas), para mostrar en las tarjetas */
export function bestInterestFree(price: number, settings: StoreSettings): InstallmentQuote | null {
  let best: InstallmentQuote | null = null
  for (const plan of settings.plans.filter((p) => p.enabled)) {
    for (const q of quotePlan(price, plan)) {
      if (q.interestFree && (!best || q.n > best.n)) best = q
    }
  }
  return best
}

/** Todas las formas de pago posibles, para elegir en el carrito */
export interface PaymentOption {
  id: string
  label: string
  factor: number
  n: number
}

export function paymentOptions(settings: StoreSettings): PaymentOption[] {
  const opts: PaymentOption[] = [
    { id: 'efectivo', label: `Efectivo o transferencia (${settings.cashDiscountPct}% off)`, factor: 1 - settings.cashDiscountPct / 100, n: 1 },
  ]
  for (const plan of settings.plans.filter((p) => p.enabled)) {
    for (const i of [...plan.installments].sort((a, b) => a.n - b.n)) {
      opts.push({
        id: `${plan.id}-${i.n}`,
        label: `${plan.name} · ${i.n} cuotas${i.coef <= 1 ? ' sin interés' : ''}`,
        factor: i.coef,
        n: i.n,
      })
    }
  }
  opts.push({ id: 'lista', label: 'Precio de lista (1 pago con tarjeta / débito)', factor: 1, n: 1 })
  return opts
}
