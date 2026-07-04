import Link from 'next/link'
import { UserPlus, Search, ShoppingCart, MessageSquareQuote, Store, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: '¿Cómo funciona? — Resuélvelo',
  description: 'Conectá con proveedores de materiales e insumos en pocos pasos.',
}

const pasosComprador = [
  { icono: UserPlus, titulo: 'Creá tu cuenta', texto: 'Registrate gratis como comprador en menos de un minuto.' },
  { icono: Search, titulo: 'Explorá el catálogo', texto: 'Buscá productos por categoría, proveedor o palabra clave.' },
  { icono: ShoppingCart, titulo: 'Armá tu carrito', texto: 'Agregá los materiales que necesitás de uno o varios proveedores.' },
  { icono: MessageSquareQuote, titulo: 'Solicitá cotización', texto: 'Enviá tu pedido y recibí respuesta directa de cada proveedor.' },
]

const pasosProveedor = [
  { icono: Store, titulo: 'Registrá tu empresa', texto: 'Creá tu cuenta de proveedor y configurá tu perfil.' },
  { icono: ShoppingCart, titulo: 'Publicá tus productos', texto: 'Cargá tu catálogo con precios, stock y unidades.' },
  { icono: MessageSquareQuote, titulo: 'Recibí cotizaciones', texto: 'Gestioná las solicitudes desde tu panel y respondé al instante.' },
]

export default function ComoFuncionaPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">¿Cómo funciona Resuélvelo?</h1>
        <p className="mt-2 text-gray-500 max-w-2xl mx-auto">
          Conectamos compradores profesionales con proveedores de materiales e insumos en República Dominicana.
        </p>
      </div>

      <section className="mb-12">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">Para compradores</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pasosComprador.map((p, i) => (
            <div key={p.titulo} className="rounded-2xl bg-white border shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center justify-center rounded-xl bg-orange-50 p-2.5 text-orange-500">
                  <p.icono className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold text-gray-100">{i + 1}</span>
              </div>
              <h3 className="mt-3 font-semibold text-gray-900">{p.titulo}</h3>
              <p className="mt-1 text-sm text-gray-500">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">Para proveedores</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {pasosProveedor.map((p, i) => (
            <div key={p.titulo} className="rounded-2xl bg-white border shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center justify-center rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  <p.icono className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold text-gray-100">{i + 1}</span>
              </div>
              <h3 className="mt-3 font-semibold text-gray-900">{p.titulo}</h3>
              <p className="mt-1 text-sm text-gray-500">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-2xl bg-orange-500 p-8 text-center text-white">
        <h2 className="text-xl font-semibold">¿Listo para empezar?</h2>
        <p className="mt-1 text-orange-50">Es gratis, siempre.</p>
        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register?rol=comprador">
            <Button className="bg-white text-orange-600 hover:bg-orange-50">
              Soy comprador
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/register?rol=proveedor">
            <Button variant="outline" className="border-white text-white hover:bg-orange-600">
              Soy proveedor
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
