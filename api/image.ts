// GET /api/image?id=...  -> la foto guardada en Neon (público, con caché larga: cada foto tiene un id único)
import { HttpError, db, handler } from './_lib/server.js'

export const GET = handler(async (req) => {
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(id)) throw new HttpError(400, 'Foto inválida')
  const rows = await db()`SELECT mime, encode(data, 'base64') AS b64 FROM public.images WHERE id = ${id} LIMIT 1`
  if (!rows[0]) throw new HttpError(404, 'Foto no encontrada')
  return new Response(Buffer.from(rows[0].b64 as string, 'base64'), {
    headers: {
      'Content-Type': rows[0].mime as string,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
})
