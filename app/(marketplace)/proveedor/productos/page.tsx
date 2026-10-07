import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { getProveedorDelUsuario, getProductosDeProveedor } from '@/lib/data'
import ListaProductosProveedor from '@/components/marketplace/ListaProductosProveedor'

export default async function ProductosProveedorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const proveedor = await getProveedorDelUsuario()
  if (!proveedor) redirect('/register?rol=proveedor')

  const productos = await getProductosDeProveedor(proveedor.id)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Mis productos</h1>
        <Link href="/proveedor/productos/nuevo">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo producto
          </Button>
        </Link>
      </div>
      <ListaProductosProveedor productos={productos} />
    </div>
  )
}
