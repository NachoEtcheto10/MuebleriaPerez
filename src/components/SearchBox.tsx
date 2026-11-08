import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { categoryLabel } from '../lib/catalog'
import { formatPrice } from '../lib/format'
import { listPrice } from '../lib/pricing'
import { searchProducts } from '../lib/search'
import { useStore } from '../lib/store'
import { Icon } from './Icon'
import { ProductImage } from './ProductImage'

/** Buscador con sugerencias: escribís "mesa" y aparecen las mesas */
export function SearchBox({ className = '', onDone }: { className?: string; onDone?: () => void }) {
  const { products } = useStore()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(-1)
  const navigate = useNavigate()
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => setQ(params.get('q') || ''), [params])

  const results = useMemo(() => (q.trim().length >= 2 ? searchProducts(products.filter((p) => !p.hidden), q).slice(0, 6) : []), [products, q])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setFocused(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const go = (path: string) => {
    setFocused(false)
    setActive(-1)
    navigate(path)
    onDone?.()
  }

  const submit = () => {
    if (active >= 0 && results[active]) return go(`/producto/${results[active].id}`)
    if (q.trim()) go(`/tienda?q=${encodeURIComponent(q.trim())}`)
  }

  const open = focused && results.length > 0

  return (
    <div ref={box} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex items-center rounded-full border border-piedra-200 bg-piedra-50 pl-4 pr-1.5 transition focus-within:border-madera-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-madera-100"
      >
        <Icon name="search" size={18} className="shrink-0 text-piedra-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setActive(-1)
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)) }
            if (e.key === 'Escape') setFocused(false)
          }}
          type="search"
          placeholder="¿Qué estás buscando?"
          aria-label="Buscar productos"
          className="w-full bg-transparent px-3 py-2.5 text-[16px] outline-none placeholder:text-piedra-400 sm:text-sm"
        />
        <button type="submit" className="rounded-full bg-piedra-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-piedra-900">
          Buscar
        </button>
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-piedra-200 bg-white shadow-xl">
          {results.map((p, i) => {
            const price = listPrice(p)
            return (
              <button key={p.id} type="button" onMouseEnter={() => setActive(i)} onClick={() => go(`/producto/${p.id}`)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === active ? 'bg-piedra-50' : ''}`}>
                <ProductImage product={p} badge={false} className="h-11 w-14 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-piedra-500">{categoryLabel(p.category, p.subcategory)}{!p.available ? ' · No disponible' : ''}</span>
                </span>
                <span className="text-sm font-semibold">{price != null ? formatPrice(price) : 'Consultar'}</span>
              </button>
            )
          })}
          <button type="button" onClick={submit}
            className="flex w-full items-center justify-center gap-1 border-t border-piedra-100 px-3 py-2.5 text-sm font-semibold text-madera-700 hover:bg-piedra-50">
            Ver todos los resultados de “{q.trim()}” <Icon name="arrowRight" size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
