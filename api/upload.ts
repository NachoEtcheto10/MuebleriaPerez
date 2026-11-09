// POST /api/upload  (solo admin) -> guarda una foto en Neon y devuelve { url }
// El cuerpo es la imagen tal cual (ya viene achicada a WebP desde el panel).
import { randomUUID } from 'node:crypto'
import { HttpError, checkRateLimit, db, handler, json, requireAdmin } from './_lib/server.js'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIMES = ['image/webp', 'image/jpeg', 'image/png']

function isValidImageBytes(buf: Buffer): boolean {
  if (buf.length < 12) return false
  // PNG: \x89PNG\r\n\x1a\n
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true
  // JPEG: \xFF\xD8\xFF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true
  return false
}

export const POST = handler(async (req) => {
  checkRateLimit(req, 40, 60_000)
  await requireAdmin(req)
  const mime = (req.headers.get('content-type') || '').split(';')[0].trim()
  if (!ALLOWED_MIMES.includes(mime)) throw new HttpError(415, 'Formato de foto no permitido (usá JPG, PNG o WebP)')
  const bytes = Buffer.from(await req.arrayBuffer())
  if (!bytes.length) throw new HttpError(400, 'La foto está vacía')
  if (bytes.length > MAX_BYTES) throw new HttpError(413, 'La foto es demasiado pesada (máx. 5 MB)')
  if (!isValidImageBytes(bytes)) throw new HttpError(400, 'El archivo no es una imagen válida o está dañado')

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
