import { getCategory } from '../lib/catalog'
import type { Product } from '../lib/types'
import { Icon } from './Icon'

interface Props {
  product: Product
  index?: number
  className?: string
  /** Muestra el cartel "No disponible" sobre la foto */
  badge?: boolean
}

/** Foto del producto. Sin foto, muestra un ícono de su categoría. Si no está disponible, en gris. */
export function ProductImage({ product, index = 0, className = '', badge = true }: Props) {
  const src = product.images[index]
  const gray = !product.available ? 'grayscale opacity-70' : ''
  return (
    <div className={`relative overflow-hidden bg-piedra-100 ${className}`}>
      {src ? (
        <img src={src} alt={product.name} loading="lazy" decoding="async" className={`h-full w-full object-cover ${gray}`} />
      ) : (
        <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-piedra-100 to-crema-200 text-piedra-400 ${gray}`}>
          <Icon name={getCategory(product.category)?.icon || 'otros'} size={badge ? 44 : 22} strokeWidth={1.3} />
          {badge && (
            <span className="px-4 text-center text-[0.7rem] font-medium uppercase tracking-wider text-piedra-400">
              Foto próximamente
            </span>
          )}
        </div>
      )}
      {badge && !product.available && (
        <span className="absolute left-3 top-3 rounded-full bg-piedra-800/90 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white">
          No disponible
        </span>
      )}
      {badge && product.available && (product.offer_label || product.discount_pct > 0) && (
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white shadow-md">
          <span>🔥</span>
          <span>{product.offer_label || `${Math.round(product.discount_pct)}% OFF`}</span>
        </span>
      )}
    </div>
  )
}
