import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { getCategorias, getProducto, getSubcategorias } from '@/lib/data'
import ProductoForm from '@/components/marketplace/ProductoForm'

interface EditarProductoPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarProductoPage({ params }: EditarProductoPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [producto, categorias, subcategorias] = await Promise.all([
    getProducto(id),
    getCategorias(),
    getSubcategorias(),
  ])

  if (!producto) notFound()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/proveedor">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Editar producto</h1>
      </div>
      <ProductoForm
        categorias={categorias}
        subcategorias={subcategorias}
        producto={producto}
      />
    </div>
  )
}
