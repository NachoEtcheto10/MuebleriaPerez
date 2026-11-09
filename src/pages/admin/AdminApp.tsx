import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { DEMO_PASSWORD, backend } from '../../lib/backend'
import { FinancingSettings } from './FinancingSettings'
import { ProductForm } from './ProductForm'
import { ProductsAdmin } from './ProductsAdmin'
import { StoreSettingsForm } from './StoreSettingsForm'

// ------------------------------------------------------------------ avisos

type Toast = { text: string; kind: 'ok' | 'error' }
const ToastContext = createContext<(text: string, kind?: Toast['kind']) => void>(() => {})
export const useToast = () => useContext(ToastContext)

function ToastHost({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const show = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    setToast({ text, kind })
    window.setTimeout(() => setToast(null), 3200)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div role="status" className={`fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-xl ${toast.kind === 'ok' ? 'bg-piedra-800' : 'bg-red-700'}`}>
          {toast.text}
        </div>
      )}
    </ToastContext.Provider>
  )
}

// ------------------------------------------------------------------ login

function Login({ onLogin }: { onLogin(): void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const demo = backend.mode === 'demo'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await backend.signIn(email.trim(), password)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ingresar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-piedra-100 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl">
        <img src="/logo-admin.png" alt="Pérez Muebles & Colchones" className="mx-auto h-20 w-20 rounded-2xl shadow-md" />
        <h1 className="mt-5 text-center font-display text-xl font-bold">Administración</h1>
        <p className="mt-1 text-center text-sm text-piedra-500">Acceso solo para el personal de la tienda</p>
        {!demo && (
          <label className="mt-6 block text-sm">
            <span className="font-medium">E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username"
              placeholder="tu-email@ejemplo.com"
              className="mt-1 w-full rounded-xl border border-piedra-200 px-3 py-2.5 text-[16px] outline-none focus:border-madera-500 sm:text-sm" />
          </label>
        )}
        <label className={`${demo ? 'mt-6' : 'mt-3'} block text-sm`}>
          <span className="font-medium">Contraseña</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-piedra-200 px-3 py-2.5 text-[16px] outline-none focus:border-madera-500 sm:text-sm" />
        </label>
        {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="mt-6 w-full rounded-xl bg-piedra-800 py-3 font-semibold text-white hover:bg-piedra-900 disabled:opacity-60">
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
        {demo && (
          <p className="mt-4 rounded-xl bg-madera-50 p-3 text-xs text-madera-700">
            Modo demo (sin Neon): la contraseña es <strong>{DEMO_PASSWORD}</strong> y los cambios se guardan solo en este navegador.
          </p>
        )}
        <Link to="/" className="mt-4 block text-center text-sm text-piedra-500 hover:text-piedra-800">Volver a la tienda</Link>
      </form>
    </div>
  )
}

// ------------------------------------------------------------------ layout

const TABS = [
  { to: '/admin', label: 'Productos', icon: 'otros', end: true },
  { to: '/admin/financiacion', label: 'Financiación', icon: 'card', end: false },
  { to: '/admin/tienda', label: 'Datos de la tienda', icon: 'store', end: false },
]

export function AdminApp() {
  const [state, setState] = useState<'checking' | 'out' | 'in'>('checking')

  useEffect(() => {
    backend.isAdmin().then((ok) => setState(ok ? 'in' : 'out'))
  }, [])

  if (state === 'checking') return <div className="p-10 text-center text-piedra-500">Cargando…</div>
  if (state === 'out') return <Login onLogin={() => setState('in')} />

  return (
    <ToastHost>
      <div className="min-h-screen bg-piedra-50">
        <header className="sticky top-0 z-30 border-b border-piedra-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
            <img src="/logo-admin.png" alt="" className="h-9 w-9 rounded-lg shadow-sm" />
            <span className="font-display font-bold">Administración</span>
            <nav className="ml-4 hidden gap-1 md:flex">
              {TABS.map((t) => (
                <NavLink key={t.to} to={t.to} end={t.end}
                  className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-piedra-800 text-white' : 'text-piedra-600 hover:bg-piedra-100'}`}>
                  <Icon name={t.icon} size={17} /> {t.label}
                </NavLink>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-1">
              <Link to="/" className="rounded-lg px-3 py-2 text-sm font-semibold text-piedra-600 hover:bg-piedra-100">Ver tienda</Link>
              <button type="button" onClick={async () => { await backend.signOut(); setState('out') }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-piedra-600 hover:bg-piedra-100">
                <Icon name="logout" size={17} /> <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end}
                className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-piedra-800 text-white' : 'bg-piedra-100 text-piedra-600'}`}>
                {t.label}
              </NavLink>
            ))}
          </nav>
        </header>

        {backend.mode === 'demo' && (
          <div className="bg-madera-50 px-4 py-2 text-center text-xs font-medium text-madera-700">
            Modo demo: los cambios se guardan solo en este navegador. Conectá Neon para que los vean todos los clientes.
          </div>
        )}

        <main className="mx-auto max-w-7xl px-4 py-6">
          <Routes>
            <Route index element={<ProductsAdmin />} />
            <Route path="productos/nuevo" element={<ProductForm />} />
            <Route path="productos/:id" element={<ProductForm />} />
            <Route path="financiacion" element={<FinancingSettings />} />
            <Route path="tienda" element={<StoreSettingsForm />} />
          </Routes>
        </main>
      </div>
    </ToastHost>
  )
}
