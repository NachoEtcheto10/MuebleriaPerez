import { useEffect, useRef, useState } from 'react'
import { getCategory } from '../lib/catalog'
import type { Product } from '../lib/types'
import { Icon } from './Icon'

interface Props {
  product: Product
  index?: number
  className?: string
  /** Muestra el cartel "No disponible" sobre la foto */
  badge?: boolean
  /** La foto llena siempre el recuadro, aunque se recorte un poco (vistas previas de la tienda) */
  fill?: boolean
}

/**
 * ¿La foto tiene que mostrarse entera? Si su forma se parece a la del recuadro, lo llena (se recorta muy poco);
 * si es muy distinta (por ejemplo, foto horizontal en recuadro vertical), se muestra entera para no cortar el mueble.
 */
function needsContain(img: HTMLImageElement) {
  const box = img.parentElement
  if (!box || !img.naturalWidth || !box.clientHeight) return false
  const ratio = img.naturalWidth / img.naturalHeight / (box.clientWidth / box.clientHeight)
  return ratio < 0.75 || ratio > 1.34
}

/**
 * Foto del producto. Sin foto, muestra un ícono de su categoría. Si no está disponible, en gris.
 * Si la foto tiene una forma muy distinta a la del recuadro, se muestra entera (sin recortar)
 * sobre un fondo difuminado de la misma foto; si no, llena todo el recuadro.
 */
export function ProductImage({ product, index = 0, className = '', badge = true, fill = false }: Props) {
  const src = product.images[index]
  const gray = !product.available ? 'grayscale opacity-70' : ''
  const ref = useRef<HTMLImageElement>(null)
  const [contain, setContain] = useState(false)
  // Al cambiar de foto se vuelve a medir (si ya estaba en caché, onLoad puede no dispararse)
  useEffect(() => {
    const el = ref.current
    setContain(!fill && !!el && el.complete && needsContain(el))
  }, [src, fill])
  return (
    <div className={`relative overflow-hidden bg-piedra-100 ${className}`}>
      {src ? (
        <>
          {contain && (
            <img src={src} alt="" aria-hidden="true" className={`absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl ${gray}`} />
          )}
          <img
            ref={ref}
            src={src}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onLoad={(e) => setContain(!fill && needsContain(e.currentTarget))}
            className={`relative h-full w-full ${contain ? 'object-contain' : 'object-cover'} ${gray}`}
          />
        </>
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
