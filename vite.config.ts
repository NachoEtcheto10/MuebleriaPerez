import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * En desarrollo (npm run dev) atiende /api/* con los mismos archivos de la carpeta api/
 * que en producción publica Vercel. Así se puede probar todo sin "vercel dev".
 */
function apiDev(): Plugin {
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const url = new URL(req.url, 'http://localhost')
        const name = url.pathname.slice('/api/'.length).replace(/\/$/, '')
        if (!/^[a-z-]+$/.test(name)) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const fn = mod[req.method || 'GET'] as ((r: Request) => Promise<Response>) | undefined
          if (!fn) {
            res.statusCode = 405
            return res.end()
          }
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const hasBody = !['GET', 'HEAD'].includes(req.method || 'GET')
          const response = await fn(new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined }))
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          next(e)
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Variables del servidor (DATABASE_URL) para las funciones de /api en desarrollo.
  // Solo las que empiezan con VITE_ llegan al navegador.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return { plugins: [react(), apiDev()] }
})
