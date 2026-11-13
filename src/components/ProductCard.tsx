import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/format'
import { bestInterestFree, cashPrice, listPrice } from '../lib/pricing'
import { useCart, useStore } from '../lib/store'
import type { Product } from '../lib/types'
import { Icon } from './Icon'
import { ProductImage } from './ProductImage'

// Color aproximado de cada terminación, solo para los puntitos de la tarjeta
const SWATCHES: Record<string, string> = {
  blanco: '#f4f2ee', blanca: '#f4f2ee', negro: '#2a2725', negra: '#2a2725', wengue: '#4a3426', venezia: '#b9875a',
  malta: '#8a6a4f', nebraska: '#c9a679', linosa: '#d8cbb6', gris: '#9a958f',
}
const swatch = (name: string) => SWATCHES[name.toLowerCase()] || '#cdc6bc'

export function ProductCard({ product }: { product: Product }) {
  const { settings } = useStore()
  const cart = useCart()
  const price = listPrice(product)
  const best = price != null ? bestInterestFree(price, settings) : null

  return (
    <article className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-piedra-200/70 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/producto/${product.id}`} className="block">
        {/* 4:5, casi la forma de una foto vertical de celular. La foto llena siempre la tarjeta (fill) */}
        <ProductImage product={product} fill className="aspect-[4/5] transition duration-500 group-hover:scale-[1.02]" />
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.brand && (
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-piedra-400">{product.brand}</p>
        )}
        <Link to={`/producto/${product.id}`} className="mt-1 line-clamp-2 min-h-[2.75em] font-medium leading-snug text-piedra-900 hover:text-madera-700">
          {product.name}
        </Link>

        {product.colors.length > 1 && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-piedra-500">
            <span className="flex -space-x-1" aria-hidden="true">
              {product.colors.slice(0, 4).map((c) => (
                <span key={c} className="h-3 w-3 rounded-full border border-white ring-1 ring-piedra-200" style={{ background: swatch(c) }} />
              ))}
            </span>
            {product.colors.length} colores disponibles
          </p>
        )}

        <div className="mt-3 flex-1">
          {price == null ? (
            <p className="text-sm font-semibold text-piedra-600">Consultar precio</p>
          ) : (
            <>
              {product.discount_pct > 0 && product.price_list != null && (
                <p className="text-xs text-piedra-400 line-through">{formatPrice(product.price_list)}</p>
              )}
              <p className="font-display text-lg font-bold text-piedra-900 sm:text-xl">{formatPrice(price)}</p>
              <p className="mt-0.5 text-sm font-semibold text-madera-700">
                {formatPrice(cashPrice(price, settings))}{' '}
                <span className="font-normal text-piedra-500">en efectivo</span>
              </p>
              {best && (
                <p className="mt-0.5 text-xs text-piedra-500">
                  {best.n} cuotas sin interés de {formatPrice(best.perInstallment)}
                </p>
              )}
            </>
          )}
        </div>

        {product.available ? (
          <button type="button" onClick={() => cart.add(product.id, 1, product.colors.length === 1 ? product.colors[0] : undefined)}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-piedra-800 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-piedra-900">
            <Icon name="cart" size={17} /> <span className="sm:hidden">Agregar</span><span className="hidden sm:inline">Agregar al carrito</span>
          </button>
        ) : (
          <span className="mt-4 inline-flex items-center justify-center rounded-xl bg-piedra-100 px-4 py-2.5 text-sm font-semibold text-piedra-400">
            No disponible
          </span>
        )}
      </div>
    </article>
  )
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
