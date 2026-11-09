// Utilidades compartidas por las funciones del servidor (carpeta /api, se publican en Vercel).
// Los archivos que empiezan con "_" no son rutas.
//
// IMPORTANTE: solo el servidor conoce DATABASE_URL (la contraseña de la base de datos).
// El navegador nunca habla directo con Postgres: pide los datos a estas funciones.
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

let client: NeonQueryFunction<false, false> | null = null

/** Conexión a Neon (se reutiliza entre pedidos mientras la función siga "caliente") */
export function db() {
  if (!client) {
    const url = (process.env.DATABASE_URL || '').replace(/[?&]channel_binding=[^&]+/g, '')
    if (!url) throw new HttpError(500, 'El servidor no tiene configurada la variable DATABASE_URL')
    client = neon(url)
  }
  return client
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...headers,
    },
  })
}

// In-memory rate limiting para mitigar ataques de fuerza bruta y denegación de servicio (ISO 27001 / SOC 2)
const rateLimits = new Map<string, { count: number; resetAt: number }>()

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown-client'
}

export function checkRateLimit(req: Request, maxRequests = 100, windowMs = 60_000) {
  const ip = getClientIp(req)
  const now = Date.now()
  const current = rateLimits.get(ip)

  if (!current || now > current.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + windowMs })
    // Limpieza periódica de IPs antiguas para evitar consumo de memoria
    if (rateLimits.size > 2000) {
      for (const [k, v] of rateLimits.entries()) {
        if (now > v.resetAt) rateLimits.delete(k)
      }
    }
    return
  }

  current.count++
  if (current.count > maxRequests) {
    throw new HttpError(429, 'Demasiadas solicitudes. Por favor esperá un minuto antes de reintentar.')
  }
}

/** Envuelve un manejador: los errores se devuelven como JSON con un mensaje legible */
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await fn(req)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status)
      console.error(e)
      return json({ error: 'Error interno del servidor' }, 500)
    }
  }
}

function bearer(req: Request) {
  const h = req.headers.get('authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7).trim() : ''
}

/**
 * Devuelve el id del admin si el token es una sesión vigente de Neon Auth
 * de un usuario que figura en public.admins. Si no, null.
 */
export async function adminFromRequest(req: Request): Promise<string | null> {
  const token = bearer(req)
  if (!token) return null
  const rows = await db()`
    SELECT a.user_id
    FROM neon_auth.session s
    JOIN public.admins a ON a.user_id = s."userId"::text
    WHERE s.token = ${token} AND s."expiresAt" > now()
    LIMIT 1
  `
  return (rows[0]?.user_id as string | undefined) ?? null
}

export async function requireAdmin(req: Request) {
  const id = await adminFromRequest(req)
  if (!id) throw new HttpError(401, 'Tu sesión venció o no tenés permisos de administrador. Volvé a ingresar.')
  return id
}

export function sessionToken(req: Request) {
  return bearer(req)
}
