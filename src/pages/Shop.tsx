import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ProductGrid } from '../components/ProductCard'
import { CATEGORIES, SIZES, getCategory, getSubcategory } from '../lib/catalog'
import { listPrice } from '../lib/pricing'
import { searchProducts } from '../lib/search'
import { useStore } from '../lib/store'
import type { Product } from '../lib/types'

const PAGE = 24
const SORTS = [
  { id: 'relevancia', label: 'Destacados' },
  { id: 'precio-asc', label: 'Menor precio' },
  { id: 'precio-desc', label: 'Mayor precio' },
  { id: 'nombre', label: 'Nombre A-Z' },
]

function sortProducts(list: Product[], sort: string) {
  const price = (p: Product) => listPrice(p) ?? Number.POSITIVE_INFINITY
  const out = [...list]
  if (sort === 'precio-asc') out.sort((a, b) => price(a) - price(b))
  else if (sort === 'precio-desc') out.sort((a, b) => (listPrice(b) ?? -1) - (listPrice(a) ?? -1))
  else if (sort === 'nombre') out.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  else {
    out.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  }
  // Los no disponibles siempre al final
  return out.sort((a, b) => Number(b.available) - Number(a.available))
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-piedra-200 py-5">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-piedra-500">{title}</h3>
      {children}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${active ? 'border-piedra-800 bg-piedra-800 text-white' : 'border-piedra-200 bg-white text-piedra-700 hover:border-piedra-400'}`}>
      {children}
    </button>
  )
}

export function Shop() {
  const { cat, sub } = useParams()
  const [params, setParams] = useSearchParams()
  const { products, loading } = useStore()
  const [shown, setShown] = useState(PAGE)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const q = params.get('q') || ''
  const size = params.get('medida') || ''
  const material = params.get('tipo') || ''
  const brand = params.get('marca') || ''
  const onlyAvailable = params.get('disponibles') === '1'
  const sort = params.get('orden') || 'relevancia'

  const category = getCategory(cat)
  const subcategory = getSubcategory(cat, sub)

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  useEffect(() => {
    setShown(PAGE)
    window.scrollTo({ top: 0 })
  }, [cat, sub, q])

  // Productos de la categoría o de la búsqueda, antes de los filtros
  const base = useMemo(() => {
    let list = (q ? searchProducts(products, q) : products).filter((p) => !p.hidden)
    if (cat) list = list.filter((p) => p.category === cat)
    if (sub) list = list.filter((p) => p.subcategory === sub)
    return list
  }, [products, q, cat, sub])

  const filtered = useMemo(() => {
    let list = base
    if (size) list = list.filter((p) => p.size === size)
    if (material) list = list.filter((p) => p.material === material)
    if (brand) list = list.filter((p) => p.brand === brand)
    if (onlyAvailable) list = list.filter((p) => p.available)
    return sortProducts(list, sort)
  }, [base, size, material, brand, onlyAvailable, sort])

  const sizes = SIZES.filter((s) => base.some((p) => p.size === s))
  const materials = ['resortes', 'espuma'].filter((m) => base.some((p) => p.material === m))
  const brands = [...new Set(base.map((p) => p.brand).filter(Boolean) as string[])].sort()
  const activeFilters = [size, material, brand, onlyAvailable ? '1' : ''].filter(Boolean).length

  const countIn = (c: string, s?: string) => products.filter((p) => !p.hidden && p.category === c && (!s || p.subcategory === s)).length

  const title = q ? `Resultados para “${q}”` : subcategory?.name || category?.name || 'Toda la tienda'

  const filters = (
    <>
      {sizes.length > 0 && (
        <FilterGroup title="Medida">
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <Chip key={s} active={size === s} onClick={() => setParam('medida', size === s ? '' : s)}>{s}</Chip>
            ))}
          </div>
        </FilterGroup>
      )}
      {materials.length > 1 && (
        <FilterGroup title="Tipo">
          <div className="flex flex-wrap gap-2">
            {materials.map((m) => (
              <Chip key={m} active={material === m} onClick={() => setParam('tipo', material === m ? '' : m)}>
                {m === 'resortes' ? 'Resortes' : 'Espuma'}
              </Chip>
            ))}
          </div>
        </FilterGroup>
      )}
      {brands.length > 1 && (
        <FilterGroup title="Marca">
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <Chip key={b} active={brand === b} onClick={() => setParam('marca', brand === b ? '' : b)}>{b}</Chip>
            ))}
          </div>
        </FilterGroup>
      )}
      <FilterGroup title="Disponibilidad">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setParam('disponibles', e.target.checked ? '1' : '')}
            className="h-4 w-4 accent-piedra-800" />
          Solo productos disponibles
        </label>
      </FilterGroup>
    </>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
      {/* Migas */}
      <nav className="flex flex-wrap items-center gap-1 text-sm text-piedra-500" aria-label="Ubicación">
        <Link to="/" className="hover:text-piedra-800">Inicio</Link>
        <Icon name="chevronRight" size={14} />
        <Link to="/tienda" className="hover:text-piedra-800">Tienda</Link>
        {category && (<><Icon name="chevronRight" size={14} /><Link to={`/categoria/${category.slug}`} className="hover:text-piedra-800">{category.name}</Link></>)}
        {subcategory && (<><Icon name="chevronRight" size={14} /><span className="text-piedra-800">{subcategory.name}</span></>)}
      </nav>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Menú lateral */}
        <aside className="hidden lg:block">
          <h2 className="text-xs font-bold uppercase tracking-wider text-piedra-500">Categorías</h2>
          <ul className="mt-3 space-y-0.5">
            {CATEGORIES.filter((c) => countIn(c.slug) > 0).map((c) => (
              <li key={c.slug}>
                <NavLink to={`/categoria/${c.slug}`} end
                  className={({ isActive }) => `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${isActive || cat === c.slug ? 'bg-white text-piedra-900 shadow-card' : 'text-piedra-700 hover:bg-white'}`}>
                  {c.name}
                  <span className="text-xs text-piedra-400">{countIn(c.slug)}</span>
                </NavLink>
                {cat === c.slug && c.subcategories.length > 0 && (
                  <ul className="my-1 ml-3 border-l border-piedra-200 pl-2">
                    {c.subcategories.filter((s) => countIn(c.slug, s.slug) > 0).map((s) => (
                      <li key={s.slug}>
                        <NavLink to={`/categoria/${c.slug}/${s.slug}`}
                          className={({ isActive }) => `flex justify-between rounded-md px-2 py-1.5 text-sm ${isActive ? 'font-semibold text-madera-700' : 'text-piedra-600 hover:text-piedra-900'}`}>
                          {s.name}
                          <span className="text-xs text-piedra-400">{countIn(c.slug, s.slug)}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4">{filters}</div>
        </aside>

        <main className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-piedra-500">{loading ? 'Cargando…' : `${filtered.length} productos`}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setFiltersOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-piedra-200 bg-white px-3 py-2 text-sm font-semibold lg:hidden">
                <Icon name="sliders" size={17} /> Filtros{activeFilters ? ` (${activeFilters})` : ''}
              </button>
              <select value={sort} onChange={(e) => setParam('orden', e.target.value === 'relevancia' ? '' : e.target.value)}
                aria-label="Ordenar" className="rounded-xl border border-piedra-200 bg-white px-3 py-2 text-sm font-medium">
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Subcategorías en el celular */}
          {category && category.subcategories.length > 0 && (
            <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
              <Link to={`/categoria/${category.slug}`}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium ${!sub ? 'border-piedra-800 bg-piedra-800 text-white' : 'border-piedra-200 bg-white'}`}>
                Todo
              </Link>
              {category.subcategories.filter((s) => countIn(category.slug, s.slug) > 0).map((s) => (
                <Link key={s.slug} to={`/categoria/${category.slug}/${s.slug}`}
                  className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium ${sub === s.slug ? 'border-piedra-800 bg-piedra-800 text-white' : 'border-piedra-200 bg-white'}`}>
                  {s.name}
                </Link>
              ))}
            </div>
          )}

          {activeFilters > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              {[
                size && { k: 'medida', v: size },
                material && { k: 'tipo', v: material === 'resortes' ? 'Resortes' : 'Espuma' },
                brand && { k: 'marca', v: brand },
                onlyAvailable && { k: 'disponibles', v: 'Disponibles' },
              ].filter(Boolean).map((f) => {
                const { k, v } = f as { k: string; v: string }
                return (
                  <button key={k} type="button" onClick={() => setParam(k, '')}
                    className="flex items-center gap-1 rounded-full bg-madera-50 px-3 py-1 font-medium text-madera-700">
                    {v} <Icon name="x" size={14} />
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-6">
            {!loading && filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-piedra-300 bg-white px-6 py-16 text-center">
                <Icon name="search" size={36} className="mx-auto text-piedra-300" />
                <p className="mt-3 font-semibold">No encontramos productos{q ? ` para “${q}”` : ''}.</p>
                <p className="mt-1 text-sm text-piedra-500">Probá con otra palabra o escribinos por WhatsApp y te ayudamos.</p>
              </div>
            ) : (
              <ProductGrid products={filtered.slice(0, shown)} />
            )}
          </div>

          {filtered.length > shown && (
            <div className="mt-8 text-center">
              <button type="button" onClick={() => setShown((n) => n + PAGE)}
                className="rounded-xl border border-piedra-800 px-6 py-3 font-semibold hover:bg-piedra-800 hover:text-white">
                Ver más productos ({filtered.length - shown})
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Filtros en el celular */}
      <div className={`fixed inset-0 z-50 lg:hidden ${filtersOpen ? '' : 'pointer-events-none'}`}>
        <div onClick={() => setFiltersOpen(false)} className={`absolute inset-0 bg-piedra-900/40 transition-opacity ${filtersOpen ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-crema px-5 pb-6 pt-4 shadow-2xl transition-transform duration-300 ${filtersOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-piedra-300" />
          <div className="flex items-center justify-between pb-2">
            <h2 className="font-display text-lg font-bold">Filtros</h2>
            <button type="button" onClick={() => setFiltersOpen(false)} className="p-2" aria-label="Cerrar filtros"><Icon name="x" size={22} /></button>
          </div>
          {filters}
          <button type="button" onClick={() => setFiltersOpen(false)} className="mt-2 w-full rounded-xl bg-piedra-800 py-3 font-semibold text-white">
            Ver {filtered.length} productos
          </button>
        </div>
      </div>
    </div>
  )
}
