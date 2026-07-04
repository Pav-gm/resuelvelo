import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { getCategorias } from '@/lib/data'
import ProductoForm from '@/components/marketplace/ProductoForm'

export default async function NuevoProductoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const categorias = await getCategorias()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/proveedor">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nuevo producto</h1>
      </div>
      <ProductoForm categorias={categorias} />
    </div>
  )
}
