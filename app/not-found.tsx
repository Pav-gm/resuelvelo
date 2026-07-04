import Link from 'next/link'
import { SearchX, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
        <SearchX className="h-8 w-8 text-orange-500" />
      </div>
      <h1 className="mt-6 text-4xl font-extrabold text-gray-900">404</h1>
      <p className="mt-2 text-lg font-semibold text-gray-700">Página no encontrada</p>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        La página que buscas no existe o fue movida. Revisa el enlace o vuelve al catálogo.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link href="/">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white px-6">
            Volver al inicio
          </Button>
        </Link>
        <Link href="/catalogo">
          <Button variant="outline" className="px-6">
            Ver catálogo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
