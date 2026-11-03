export interface Product {
  id: string
  code: string
  name: string
  description: string
  category: string
  subcategory: string | null
  brand: string | null
  /** Colchones: 1 plaza, 2 plazas, Queen... */
  size: string | null
  /** Colchones: 80x190, 140x190... */
  measure: string | null
  /** Colchones: resortes | espuma */
  material: string | null
  /** Colchones: colchon | conjunto */
  kind: string | null
  /** Agrupa el mismo modelo en distintas medidas */
  model: string | null
  colors: string[]
  /** Precio de lista publicado. null = consultar precio */
  price_list: number | null
  /** Descuento propio del producto (oferta), en % sobre el precio de lista */
  discount_pct: number
  available: boolean
  featured: boolean
  images: string[]
  sort: number
}

export interface Installment {
  n: number
  coef: number
}

export interface FinancingPlan {
  id: string
  name: string
  enabled: boolean
  installments: Installment[]
}

export interface StoreSettings {
  cashDiscountPct: number
  plans: FinancingPlan[]
  whatsapp: string
  address: string
  city: string
  hours: string
  instagram: string
  facebook: string
  email: string
  heroTitle: string
  heroText: string
  /** Foto propia de cada ambiente en el inicio (slug de categoría -> URL). Vacío = foto por defecto */
  categoryImages: Record<string, string>
}

export const DEFAULT_SETTINGS: StoreSettings = {
  cashDiscountPct: 20,
  plans: [
    {
      id: 'visa-mastercard', name: 'Visa y Mastercard', enabled: true,
      installments: [{ n: 3, coef: 1 }, { n: 6, coef: 1 }, { n: 12, coef: 1.2 }],
    },
    {
      id: 'naranja', name: 'Naranja', enabled: true,
      installments: [{ n: 3, coef: 1 }, { n: 6, coef: 1 }, { n: 12, coef: 1.2 }],
    },
    {
      id: 'credito-personal', name: 'Crédito personal', enabled: true,
      installments: [{ n: 3, coef: 1 }, { n: 6, coef: 1.21 }, { n: 12, coef: 1.56 }],
    },
    {
      id: 'credito-argentino', name: 'Crédito Argentino', enabled: true,
      installments: [{ n: 3, coef: 1 }, { n: 6, coef: 1.21 }, { n: 12, coef: 1.56 }],
    },
  ],
  whatsapp: '5493442443309',
  address: 'Bv. J. Sansoni 1932',
  city: 'Concepción del Uruguay, Entre Ríos',
  hours: 'Lunes a viernes de 8:30 a 12:30 y de 16:30 a 20:30 · Sábados de 9:00 a 13:00',
  instagram: 'https://www.instagram.com/perezmueblesycolchones',
  facebook: 'https://www.facebook.com/perezmueblesycolchones',
  email: 'perezmueblesycolchones@gmail.com',
  heroTitle: 'Muebles y colchones para vivir tu casa',
  heroText: 'Elegí tus productos, armá el pedido y envialo por WhatsApp. Te asesoramos para que lo pagues como más te convenga.',
  categoryImages: {},
}

export interface CartItem {
  id: string
  qty: number
  color?: string
}
