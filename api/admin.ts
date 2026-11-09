// POST /api/admin  { action, ... }
// - "me": dice si el token es de un admin (no requiere estar logueado)
// - "logout": cierra la sesión de ese token
// - el resto (guardar/borrar productos y configuración) solo para admins
import { HttpError, adminFromRequest, checkRateLimit, db, handler, json, requireAdmin, sessionToken } from './_lib/server.js'

type Row = Record<string, unknown>

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const strOrNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

/** Valida y normaliza un producto recibido del navegador */
function cleanProduct(p: unknown) {
  if (!p || typeof p !== 'object') throw new HttpError(400, 'Producto inválido')
  const r = p as Row
  const id = str(r.id).trim()
  if (!id || id.length > 200) throw new HttpError(400, 'El producto no tiene un id válido')
  if (!str(r.code).trim() || !str(r.name).trim()) throw new HttpError(400, 'Falta el código o el nombre del producto')
  const price = r.price_list == null ? null : num(r.price_list, NaN)
  if (price != null && (Number.isNaN(price) || price < 0)) throw new HttpError(400, 'El precio no es válido')
  return {
    id,
    code: str(r.code).trim(),
    name: str(r.name).trim(),
    description: str(r.description),
    category: str(r.category) || 'otros',
    subcategory: strOrNull(r.subcategory),
    brand: strOrNull(r.brand),
    size: strOrNull(r.size),
    measure: strOrNull(r.measure),
    material: strOrNull(r.material),
    kind: strOrNull(r.kind),
    model: strOrNull(r.model),
    colors: strList(r.colors),
    price_list: price,
    discount_pct: Math.min(90, Math.max(0, num(r.discount_pct))),
    available: r.available !== false,
    featured: r.featured === true,
    images: strList(r.images),
    sort: Math.trunc(num(r.sort)),
    hidden: r.hidden === true,
    youtube_url: strOrNull(r.youtube_url),
    offer: strOrNull(r.offer),
    offer_label: strOrNull(r.offer_label),
  }
}

async function upsertProduct(p: ReturnType<typeof cleanProduct>) {
  await db()`
    INSERT INTO public.products (
      id, code, name, description, category, subcategory, brand, size, measure,
      material, kind, model, colors, price_list, discount_pct, available, featured, images, sort,
      hidden, youtube_url, offer, offer_label, updated_at
    ) VALUES (
      ${p.id}, ${p.code}, ${p.name}, ${p.description}, ${p.category},
      ${p.subcategory}, ${p.brand}, ${p.size}, ${p.measure},
      ${p.material}, ${p.kind}, ${p.model}, ${p.colors},
      ${p.price_list}, ${p.discount_pct}, ${p.available},
      ${p.featured}, ${p.images}, ${p.sort},
      ${p.hidden}, ${p.youtube_url}, ${p.offer}, ${p.offer_label}, now()
    )
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code, name = EXCLUDED.name, description = EXCLUDED.description,
      category = EXCLUDED.category, subcategory = EXCLUDED.subcategory, brand = EXCLUDED.brand,
      size = EXCLUDED.size, measure = EXCLUDED.measure, material = EXCLUDED.material,
      kind = EXCLUDED.kind, model = EXCLUDED.model, colors = EXCLUDED.colors,
      price_list = EXCLUDED.price_list, discount_pct = EXCLUDED.discount_pct,
      available = EXCLUDED.available, featured = EXCLUDED.featured, images = EXCLUDED.images,
      sort = EXCLUDED.sort, hidden = EXCLUDED.hidden, youtube_url = EXCLUDED.youtube_url,
      offer = EXCLUDED.offer, offer_label = EXCLUDED.offer_label, updated_at = now()
  `
}

export const POST = handler(async (req) => {
  checkRateLimit(req, 60, 60_000)
  let body: Row
  try {
    body = (await req.json()) as Row
  } catch {
    throw new HttpError(400, 'Pedido inválido')
  }
  const action = str(body.action)

  if (action === 'me') return json({ admin: !!(await adminFromRequest(req)) })

  if (action === 'logout') {
    const token = sessionToken(req)
    if (token) await db()`DELETE FROM neon_auth.session WHERE token = ${token}`
    return json({ ok: true })
  }

  await requireAdmin(req)
  const sql = db()

  switch (action) {
    case 'saveProduct':
      await upsertProduct(cleanProduct(body.product))
      return json({ ok: true })

    case 'saveProducts': {
      if (!Array.isArray(body.products)) throw new HttpError(400, 'Lista de productos inválida')
      const list = body.products.map(cleanProduct)
      for (let i = 0; i < list.length; i += 25) await Promise.all(list.slice(i, i + 25).map(upsertProduct))
      return json({ ok: true })
    }

    case 'deleteProduct': {
      const id = str(body.id)
      if (!id) throw new HttpError(400, 'Falta el producto a borrar')
      await sql`DELETE FROM public.products WHERE id = ${id}`
      return json({ ok: true })
    }

    case 'saveSettings': {
      if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) {
        throw new HttpError(400, 'Configuración inválida')
      }
      await sql`
        INSERT INTO public.settings (id, data) VALUES (1, ${JSON.stringify(body.settings)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
      `
      return json({ ok: true })
    }

    default:
      throw new HttpError(400, 'Acción desconocida')
  }
})
