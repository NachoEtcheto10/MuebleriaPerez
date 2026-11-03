import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'

const rawUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || ''
const DATABASE_URL = rawUrl.replace(/[?&]channel_binding=[^&]+/g, '')
const AUTH_URL = process.env.NEON_AUTH_BASE_URL || process.env.VITE_NEON_AUTH_URL
const ADMIN_EMAILS = ['perezmueblesycolchones@gmail.com', 'perezhermanos@gmail.com']
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'perezhermanos2026'

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function main() {
  console.log('1. Verifying tables in public schema...')
  await sql`
    CREATE TABLE IF NOT EXISTS public.products (
      id           text PRIMARY KEY,
      code         text NOT NULL,
      name         text NOT NULL,
      description  text NOT NULL DEFAULT '',
      category     text NOT NULL,
      subcategory  text,
      brand        text,
      size         text,
      measure      text,
      material     text,
      kind         text,
      model        text,
      colors       text[] NOT NULL DEFAULT '{}',
      price_list   numeric,
      discount_pct numeric NOT NULL DEFAULT 0,
      available    boolean NOT NULL DEFAULT true,
      featured     boolean NOT NULL DEFAULT false,
      images       text[] NOT NULL DEFAULT '{}',
      sort         integer NOT NULL DEFAULT 0,
      created_at   timestamptz NOT NULL DEFAULT now(),
      updated_at   timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS public.settings (
      id   integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      data jsonb NOT NULL DEFAULT '{}'::jsonb
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS public.admins (
      user_id    text PRIMARY KEY,
      email      text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `

  if (AUTH_URL) {
    console.log('2. Registering Pérez Hermanos Admin users in Neon Auth...')
    for (const email of ADMIN_EMAILS) {
      const existingUsers = await sql`SELECT id, email FROM neon_auth.user WHERE email = ${email}`
      let adminUserId = existingUsers[0]?.id

      if (!adminUserId) {
        const res = await fetch(`${AUTH_URL}/sign-up/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:5173',
          },
          body: JSON.stringify({
            email,
            password: ADMIN_PASSWORD,
            name: 'Pérez Hermanos Admin',
          }),
        })
        const body = await res.json()
        if (!res.ok) {
          throw new Error(`Sign-up failed (${res.status}): ${JSON.stringify(body)}`)
        }
        adminUserId = body.user?.id
        console.log('Created user in Neon Auth:', body.user?.email, 'id:', adminUserId)
      } else {
        console.log('User already exists in Neon Auth:', email, 'id:', adminUserId)
      }

      if (adminUserId) {
        await sql`
          INSERT INTO public.admins (user_id, email)
          VALUES (${adminUserId}, ${email})
          ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
        `
      }
    }
  }

  const admins = await sql`SELECT * FROM public.admins`
  console.log('Active Admins in Neon:', admins)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
