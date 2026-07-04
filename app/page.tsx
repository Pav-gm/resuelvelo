import Link from 'next/link'
import { Search, Star, Shield, Zap, ArrowRight, Package, Hammer, Wrench, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'

const categorias = [
  { nombre: 'Ferretería', slug: 'ferreteria', icono: Hammer, color: 'bg-orange-50 text-orange-600' },
  { nombre: 'Electricidad', slug: 'electricidad', icono: Lightbulb, color: 'bg-yellow-50 text-yellow-600' },
  { nombre: 'Plomería', slug: 'plomeria', icono: Wrench, color: 'bg-blue-50 text-blue-600' },
  { nombre: 'Materiales', slug: 'materiales', icono: Package, color: 'bg-green-50 text-green-600' },
]

const beneficios = [
  { icono: Search, titulo: 'Compara precios al instante', descripcion: 'Consulta catálogos de múltiples proveedores en un solo lugar, sin llamadas ni visitas.' },
  { icono: Zap, titulo: 'Cotiza en minutos', descripcion: 'Envía solicitudes de cotización a varios proveedores simultáneamente y recibe respuestas rápidas.' },
  { icono: Shield, titulo: 'Proveedores verificados', descripcion: 'Cada proveedor en la plataforma pasa por un proceso de verificación para garantizar confiabilidad.' },
  { icono: Star, titulo: 'Historial y trazabilidad', descripcion: 'Todas tus cotizaciones, pedidos y facturas en un solo lugar, siempre disponibles.' },
]

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900 py-20 md:py-28">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, #f97316 0%, transparent 50%), radial-gradient(circle at 75% 50%, #ea580c 0%, transparent 50%)' }} />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="inline-block rounded-full bg-orange-500/20 px-4 py-1.5 text-sm font-medium text-orange-300 ring-1 ring-orange-500/30">
            Marketplace B2B en República Dominicana
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-6xl">
            Consigue los mejores<br />
            <span className="text-orange-400">proveedores de materiales</span><br />
            en un solo lugar
          </h1>
          <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
            Conectamos contratistas, constructoras y PYMEs con ferreterías, plomerías, distribuidoras y mayoristas. Compara precios, cotiza y compra sin perder tiempo.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/catalogo">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8">
                Ver catálogo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/register?rol=proveedor">
              <Button size="lg" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white px-8">
                Soy proveedor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-gray-900">Explora por categoría</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {categorias.map((cat) => (
              <Link
                key={cat.nombre}
                href={`/catalogo?categoria=${cat.slug}`}
                className={`flex flex-col items-center gap-3 rounded-2xl p-6 transition-transform hover:scale-105 ${cat.color}`}
              >
                <cat.icono className="h-8 w-8" />
                <span className="font-semibold text-sm">{cat.nombre}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">¿Por qué usar Resuélvelo?</h2>
            <p className="mt-2 text-gray-500">Todo lo que necesitás para comprar materiales con inteligencia</p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {beneficios.map((b) => (
              <div key={b.titulo} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
                  <b.icono className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{b.titulo}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{b.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Proveedor */}
      <section className="bg-orange-500 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">¿Sos proveedor de materiales?</h2>
          <p className="mt-4 text-orange-100">
            Publica tu catálogo, recibe cotizaciones y llega a cientos de compradores profesionales en toda la República Dominicana.
          </p>
          <Link href="/register?rol=proveedor" className="mt-8 inline-block">
            <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 px-8 font-semibold">
              Registra tu empresa gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
