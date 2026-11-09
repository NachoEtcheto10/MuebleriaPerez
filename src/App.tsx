import { Suspense, lazy } from 'react'
import { Link, Outlet, Route, Routes } from 'react-router-dom'
import { CartDrawer } from './components/CartDrawer'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Icon } from './components/Icon'
import { useCart, useStore } from './lib/store'
import { Home } from './pages/Home'

// Carga diferida de páginas secundarias para optimizar el First Load y Lighthouse Performance
const Shop = lazy(() => import('./pages/Shop').then((m) => ({ default: m.Shop })))
const ProductPage = lazy(() => import('./pages/ProductPage').then((m) => ({ default: m.ProductPage })))
const OrderPage = lazy(() => import('./pages/OrderPage').then((m) => ({ default: m.OrderPage })))
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const AdminApp = lazy(() => import('./pages/admin/AdminApp').then((m) => ({ default: m.AdminApp })))

function WhatsAppFloat() {
  const { settings } = useStore()
  const cart = useCart()
  if (!settings.whatsapp || cart.open) return null
  return (
    <a
      href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#25d366] text-white shadow-xl transition hover:scale-105 active:scale-95"
    >
      <Icon name="whatsapp" size={30} />
    </a>
  )
}

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8 text-piedra-400">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-piedra-300 border-t-madera-600" />
    </div>
  )
}

function StoreLayout() {
  const { error } = useStore()
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {error && (
        <div className="bg-red-50 px-4 py-3 text-center text-sm text-red-800">
          No pudimos cargar el catálogo ({error}). Probá recargar la página.
        </div>
      )}
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-6xl font-extrabold text-piedra-300">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold">No encontramos esta página</h1>
      <Link to="/tienda" className="mt-4 inline-block font-semibold text-madera-700">Ir a la tienda</Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<Home />} />
        <Route path="tienda" element={<Shop />} />
        <Route path="categoria/:cat" element={<Shop />} />
        <Route path="categoria/:cat/:sub" element={<Shop />} />
        <Route path="producto/:id" element={<ProductPage />} />
        <Route path="pedido" element={<OrderPage />} />
        <Route path="contacto" element={<ContactPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin/*" element={<Suspense fallback={<div className="p-10 text-center">Cargando…</div>}><AdminApp /></Suspense>} />
    </Routes>
  )
}
