// GET /api/catalog -> { products, settings }  (público: lo usa la tienda)
import { checkRateLimit, db, handler, json } from './_lib/server.js'

export const GET = handler(async (req) => {
  checkRateLimit(req, 120, 60_000)
  const sql = db()
  const [products, settings] = await Promise.all([
    sql`SELECT * FROM public.products ORDER BY sort ASC, name ASC`,
    sql`SELECT data FROM public.settings WHERE id = 1 LIMIT 1`,
  ])
  // Caché corta en el CDN de Vercel: la tienda carga rápido y los cambios del admin se ven en segundos
  return json({ products, settings: settings[0]?.data ?? null }, 200, {
    'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=60',
  })
})
