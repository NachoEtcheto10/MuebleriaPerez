// POST /api/upload  (solo admin) -> guarda una foto en Neon y devuelve { url }
// El cuerpo es la imagen tal cual (ya viene achicada a WebP desde el panel).
import { randomUUID } from 'node:crypto'
import { HttpError, db, handler, json, requireAdmin } from './_lib/server.js'

const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED = ['image/webp', 'image/jpeg', 'image/png']

export const POST = handler(async (req) => {
  await requireAdmin(req)
  const mime = (req.headers.get('content-type') || '').split(';')[0].trim()
  if (!ALLOWED.includes(mime)) throw new HttpError(415, 'Formato de foto no permitido (usá JPG, PNG o WebP)')
  const bytes = Buffer.from(await req.arrayBuffer())
  if (!bytes.length) throw new HttpError(400, 'La foto está vacía')
  if (bytes.length > MAX_BYTES) throw new HttpError(413, 'La foto es demasiado pesada (máx. 3 MB)')

  const sql = db()
  await sql`
    CREATE TABLE IF NOT EXISTS public.images (
      id         text PRIMARY KEY,
      mime       text NOT NULL,
      data       bytea NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `
  const id = randomUUID()
  await sql`INSERT INTO public.images (id, mime, data) VALUES (${id}, ${mime}, decode(${bytes.toString('base64')}, 'base64'))`
  return json({ url: `/api/image?id=${id}` })
})
