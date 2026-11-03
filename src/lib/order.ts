import { formatPrice } from './format'
import { listPrice, type PaymentOption } from './pricing'
import type { CartItem, Product } from './types'

export interface OrderLine {
  item: CartItem
  product: Product
  unit: number | null
}

export function orderLines(items: CartItem[], byId: Map<string, Product>): OrderLine[] {
  return items
    .map((item) => {
      const product = byId.get(item.id)
      return product ? { item, product, unit: listPrice(product) } : null
    })
    .filter((l): l is OrderLine => l !== null)
}

export function orderTotals(lines: OrderLine[], option?: PaymentOption) {
  const list = lines.reduce((s, l) => s + (l.unit ?? 0) * l.item.qty, 0)
  const pending = lines.some((l) => l.unit == null)
  const total = option ? list * option.factor : list
  return { list, total, perInstallment: option && option.n > 1 ? total / option.n : null, pending }
}

export function orderMessage(lines: OrderLine[], option: PaymentOption, customer: { name: string; city: string; notes: string }) {
  const t = orderTotals(lines, option)
  const out: string[] = ['¡Hola Pérez Muebles & Colchones! Quiero hacer este pedido:', '']
  for (const l of lines) {
    const parts = [`• ${l.item.qty} x ${l.product.name} (cód. ${l.product.code})`]
    if (l.item.color) parts.push(`  Color: ${l.item.color}`)
    else if (l.product.colors.length > 1) parts.push(`  Color: a confirmar (${l.product.colors.join(', ')})`)
    parts.push(`  ${l.unit != null ? `${formatPrice(l.unit)} c/u (lista)` : 'Precio a consultar'}`)
    out.push(parts.join('\n'))
  }
  out.push('')
  out.push(`Total precio de lista: ${formatPrice(t.list)}${t.pending ? ' + productos a consultar' : ''}`)
  out.push(`Forma de pago: ${option.label}`)
  if (option.id !== 'lista') {
    out.push(
      t.perInstallment
        ? `Total: ${formatPrice(t.total)} en ${option.n} cuotas de ${formatPrice(t.perInstallment)}`
        : `Total: ${formatPrice(t.total)}`,
    )
  }
  out.push('')
  if (customer.name) out.push(`Nombre: ${customer.name}`)
  if (customer.city) out.push(`Localidad: ${customer.city}`)
  if (customer.notes) out.push(`Comentarios: ${customer.notes}`)
  return out.join('\n')
}
