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
  /** Oculto en la tienda (no se muestra al público) */
  hidden?: boolean
  /** Video de YouTube opcional para el producto */
  youtube_url?: string
  /** Id de la promoción u oferta predeterminada */
  offer?: string
  /** Etiqueta visible de la promoción (ej. '20% OFF', 'Envío Gratis') */
  offer_label?: string
}

export interface PromoOffer {
  id: string
  label: string
  badge: string
  discountPct?: number
}

export const PROMO_OFFERS: PromoOffer[] = [
  { id: '', label: 'Sin oferta', badge: '', discountPct: 0 },
  { id: 'off-10', label: '10% OFF Especial', badge: '10% OFF', discountPct: 10 },
  { id: 'off-15', label: '15% OFF Temporada', badge: '15% OFF', discountPct: 15 },
  { id: 'off-20', label: '20% OFF Oferta', badge: '20% OFF', discountPct: 20 },
  { id: 'off-25', label: '25% OFF Liquidación', badge: '25% OFF', discountPct: 25 },
  { id: 'envio-gratis', label: 'Envío Gratis Local', badge: 'Envío Gratis', discountPct: 0 },
  { id: 'combo-regalo', label: 'Combo con Regalo', badge: 'Regalo con tu compra', discountPct: 0 },
  { id: 'cuotas-fijas', label: '6 Cuotas Sin Interés', badge: '6 Cuotas Sin Interés', discountPct: 0 },
]

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
  /** URL o ID del video de YouTube o canal de la tienda */
  youtubeUrl?: string
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
  youtubeUrl: '',
  categoryImages: {},
}

export interface CartItem {
  id: string
  qty: number
  color?: string
}
