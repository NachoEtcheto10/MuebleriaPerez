import { useCallback, useEffect, useRef, useState } from 'react'
import type { Product } from '../lib/types'
import { Icon } from './Icon'
import { ProductCard } from './ProductCard'

interface Props {
  products: Product[]
  /** Avanza solo cada tantos ms (se pausa al pasar el mouse o tocar). 0 = sin avance automático */
  autoplay?: number
}

/**
 * Fila de productos que se desliza con flechas (escritorio) o con el dedo (celular).
 * Todas las tarjetas tienen el mismo ancho y el mismo alto.
 */
export function ProductCarousel({ products, autoplay = 0 }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [paused, setPaused] = useState(false)

  const update = useCallback(() => {
    const el = track.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [update, products])

  const step = (dir: -1 | 1) => {
    const el = track.current
    if (!el) return
    const item = el.firstElementChild as HTMLElement | null
    const width = item ? item.offsetWidth + 16 : el.clientWidth
    // Avanza de a "una página" de tarjetas completas
    const perPage = Math.max(1, Math.floor((el.clientWidth + 16) / width))
    el.scrollBy({ left: dir * perPage * width, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!autoplay || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => {
      const el = track.current
      if (!el) return
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) el.scrollTo({ left: 0, behavior: 'smooth' })
      else step(1)
    }, autoplay)
    return () => clearInterval(t)
  }, [autoplay, paused])

  if (!products.length) return null

  const arrow = 'absolute top-[28%] z-10 hidden h-11 w-11 place-items-center rounded-full border border-piedra-200 bg-white/95 text-piedra-800 shadow-card transition hover:bg-piedra-800 hover:text-white disabled:pointer-events-none disabled:opacity-0 sm:grid'

  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)} onFocus={() => setPaused(true)}>
      <button type="button" onClick={() => step(-1)} disabled={!canPrev} aria-label="Anteriores" className={`${arrow} -left-3 lg:-left-5`}>
        <Icon name="chevronLeft" size={22} />
      </button>
      <div ref={track} onScroll={update}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-3 pt-1 scroll-px-4">
        {products.map((p) => (
          // Ancho fijo por pantalla + "flex" para que todas las tarjetas queden del mismo alto
          <div key={p.id} className="flex w-[46%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      <button type="button" onClick={() => step(1)} disabled={!canNext} aria-label="Siguientes" className={`${arrow} -right-3 lg:-right-5`}>
        <Icon name="chevronRight" size={22} />
      </button>
    </div>
  )
}
