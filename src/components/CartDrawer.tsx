import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/format'
import { orderLines, orderTotals } from '../lib/order'
import { cashPrice } from '../lib/pricing'
import { useCart, useStore } from '../lib/store'
import { Icon } from './Icon'
import { ProductImage } from './ProductImage'

export function QtyControl({ value, onChange }: { value: number; onChange(n: number): void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-piedra-200">
      <button type="button" onClick={() => onChange(value - 1)} className="p-1.5 text-piedra-600 disabled:opacity-30" disabled={value <= 1} aria-label="Restar uno">
        <Icon name="minus" size={15} />
      </button>
      <span className="w-7 text-center text-sm font-semibold">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} className="p-1.5 text-piedra-600" aria-label="Sumar uno">
        <Icon name="plus" size={15} />
      </button>
    </div>
  )
}

/** Selector de color dentro del carrito, para productos con varias terminaciones */
export function ColorSelect({ colors, value, onChange }: { colors: string[]; value?: string; onChange(c: string): void }) {
  if (colors.length < 2) return null
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} aria-label="Color"
      className={`mt-2 w-full rounded-lg border px-2 py-1.5 text-sm ${value ? 'border-piedra-200 bg-white' : 'border-madera-500 bg-madera-50 font-semibold text-madera-700'}`}>
      {!value && <option value="">Elegí el color…</option>}
      {colors.map((c) => <option key={c} value={c}>Color: {c}</option>)}
    </select>
  )
}

export function CartDrawer() {
  const cart = useCart()
  const { byId, settings } = useStore()
  const lines = orderLines(cart.items, byId)
  const totals = orderTotals(lines)

  useEffect(() => {
    if (!cart.open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cart.setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [cart])

  return (
    <div className={`fixed inset-0 z-[60] ${cart.open ? '' : 'pointer-events-none'}`} aria-hidden={!cart.open}>
      <div onClick={() => cart.setOpen(false)} className={`absolute inset-0 bg-piedra-900/40 transition-opacity ${cart.open ? 'opacity-100' : 'opacity-0'}`} />
      <aside role="dialog" aria-label="Tu carrito"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${cart.open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-piedra-100 px-5 py-4">
          <h2 className="font-display text-lg font-bold">Tu carrito</h2>
          <button type="button" onClick={() => cart.setOpen(false)} className="rounded-lg p-2 hover:bg-piedra-50" aria-label="Cerrar">
            <Icon name="x" size={22} />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-piedra-500">
            <Icon name="cart" size={44} strokeWidth={1.3} />
            <p>Todavía no agregaste productos.</p>
            <Link to="/tienda" onClick={() => cart.setOpen(false)} className="font-semibold text-madera-700">Ir a la tienda</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-piedra-100 overflow-y-auto px-5">
              {lines.map((l, i) => (
                <li key={`${l.item.id}-${l.item.color}`} className="flex gap-3 py-4">
                  <ProductImage product={l.product} badge={false} className="h-16 w-20 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/producto/${l.product.id}`} onClick={() => cart.setOpen(false)} className="line-clamp-2 text-sm font-medium leading-snug">
                      {l.product.name}
                    </Link>
                    {l.item.color && l.product.colors.length < 2 && <p className="text-xs text-piedra-500">{l.item.color}</p>}
                    <ColorSelect colors={l.product.colors} value={l.item.color} onChange={(c) => cart.setColor(i, c)} />
                    <div className="mt-2 flex items-center justify-between">
                      <QtyControl value={l.item.qty} onChange={(n) => cart.update(i, n)} />
                      <span className="text-sm font-semibold">{l.unit != null ? formatPrice(l.unit * l.item.qty) : 'Consultar'}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => cart.remove(i)} className="self-start p-1 text-piedra-400 hover:text-piedra-800" aria-label="Quitar">
                    <Icon name="trash" size={17} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-piedra-100 bg-piedra-50 px-5 py-4">
              <div className="flex justify-between text-sm">
                <span>Total precio de lista</span>
                <span className="font-semibold">{formatPrice(totals.list)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm text-madera-700">
                <span>En efectivo o transferencia</span>
                <span className="font-bold">{formatPrice(cashPrice(totals.list, settings))}</span>
              </div>
              {totals.pending && <p className="mt-2 text-xs text-piedra-500">Algunos productos tienen el precio a consultar.</p>}
              {lines.some((l) => l.product.colors.length > 1 && !l.item.color) && (
                <p className="mt-2 text-xs font-medium text-madera-700">Elegí el color de cada producto antes de finalizar.</p>
              )}
              <Link to="/pedido" onClick={() => cart.setOpen(false)}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-piedra-800 px-4 py-3 font-semibold text-white hover:bg-piedra-900">
                Finalizar pedido <Icon name="arrowRight" size={18} />
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
