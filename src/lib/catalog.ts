// Estructura de categorías de la tienda (según la planilla de Pérez)

export interface Subcategory {
  slug: string
  name: string
}

export interface Category {
  slug: string
  name: string
  group: 'muebles' | 'colchones' | 'sofas'
  icon: IconName
  /** Foto por defecto del ambiente (se puede cambiar desde Administración -> Datos de la tienda) */
  photo: string
  subcategories: Subcategory[]
}

export type IconName =
  | 'cama' | 'living' | 'cocina' | 'oficina' | 'patio' | 'otros' | 'colchon' | 'sofa'

const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=600&q=70`

const sub = (slug: string, name: string): Subcategory => ({ slug, name })

export const CATEGORIES: Category[] = [
  {
    slug: 'habitacion', name: 'Habitación', group: 'muebles', icon: 'cama', photo: unsplash('photo-1505693416388-ac5ce068fe85'),
    subcategories: [
      sub('placares', 'Placares'), sub('respaldos-de-sommier', 'Respaldos de sommier'),
      sub('mesas-de-luz', 'Mesas de luz'), sub('botineros', 'Botineros'), sub('camas', 'Camas'),
      sub('cunas', 'Cunas'), sub('cajoneras', 'Cajoneras'),
    ],
  },
  {
    slug: 'living-comedor', name: 'Living Comedor', group: 'muebles', icon: 'living', photo: unsplash('photo-1493663284031-b7e3aefcae8e'),
    subcategories: [
      sub('mesas', 'Mesas'), sub('sillas', 'Sillas'), sub('combos', 'Combos'), sub('racks', 'Racks'),
      sub('bahiuts', 'Bahiuts'), sub('modulares', 'Modulares'), sub('barra-desayunador', 'Barra desayunador'),
      sub('mesas-ratonas', 'Mesas ratonas'), sub('otros', 'Otros'),
    ],
  },
  {
    slug: 'cocina', name: 'Cocina', group: 'muebles', icon: 'cocina', photo: unsplash('photo-1556911220-bff31c812dba'),
    subcategories: [
      sub('despenseros', 'Despenseros'), sub('botelleros', 'Botelleros'), sub('bajomesadas', 'Bajomesadas'),
      sub('alacenas', 'Alacenas'), sub('mesadas', 'Mesadas'),
    ],
  },
  {
    slug: 'oficina', name: 'Oficina', group: 'muebles', icon: 'oficina', photo: unsplash('photo-1518455027359-f3f8164ba6bd'),
    subcategories: [
      sub('escritorios', 'Escritorios'), sub('bibliotecas', 'Bibliotecas'), sub('sillas-de-oficina', 'Sillas de oficina'),
    ],
  },
  {
    slug: 'patio', name: 'Patio', group: 'muebles', icon: 'patio', photo: unsplash('photo-1416331108676-a22ccb276e35'),
    subcategories: [
      sub('sillas', 'Sillas'), sub('mesas', 'Mesas'), sub('combos', 'Combos'), sub('sillones', 'Sillones'),
      sub('reposeras', 'Reposeras'),
    ],
  },
  {
    slug: 'colchones', name: 'Colchones', group: 'colchones', icon: 'colchon', photo: unsplash('photo-1617325247661-675ab4b64ae2'),
    subcategories: [
      sub('resortes', 'Resortes'), sub('espuma', 'Espuma'), sub('sommiers', 'Sommiers'),
      sub('conjuntos', 'Conjuntos'), sub('almohadas', 'Almohadas'),
    ],
  },
  {
    slug: 'sofas', name: 'Sofás', group: 'sofas', icon: 'sofa', photo: unsplash('photo-1555041469-a586c61ea9bc'),
    subcategories: [sub('kappesberg', 'Kappesberg'), sub('living-color', 'Living Color'), sub('otros', 'Otros')],
  },
  { slug: 'otros', name: 'Otros', group: 'muebles', icon: 'otros', photo: unsplash('photo-1611486212557-88be5ff6f941'), subcategories: [] },
]

/** Medidas de colchones, en el orden en que se muestran en el filtro */
export const SIZES = ['1 plaza', '1 plaza y media', '2 plazas', 'Queen', 'King', 'Super King', 'Cuna']

export function getCategory(slug?: string | null) {
  return CATEGORIES.find((c) => c.slug === slug)
}

/** Foto del ambiente: la cargada en Administración o, si no hay, la de por defecto */
export function categoryPhoto(c: Category, custom?: Record<string, string>) {
  return custom?.[c.slug] || c.photo
}

export function getSubcategory(cat?: string | null, subSlug?: string | null) {
  return getCategory(cat)?.subcategories.find((s) => s.slug === subSlug)
}

export function categoryLabel(cat?: string | null, subSlug?: string | null) {
  const c = getCategory(cat)
  const s = getSubcategory(cat, subSlug)
  return [c?.name, s?.name].filter(Boolean).join(' · ')
}
