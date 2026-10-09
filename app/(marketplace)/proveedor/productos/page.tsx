import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { getProveedorDelUsuario, getProductosDeProveedor } from '@/lib/data'
import ListaProductosProveedor from '@/components/marketplace/ListaProductosProveedor'

interface ProductosProveedorPageProps {
  searchParams?: Promise<{ tab?: string | string[] }>
}

export default async function ProductosProveedorPage({
  searchParams,
}: ProductosProveedorPageProps = {}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const proveedor = await getProveedorDelUsuario()
  if (!proveedor) redirect('/register?rol=proveedor')

  const params = (await searchParams) ?? {}
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab
  const enArchivados = tab === 'archivados'

  const todos = await getProductosDeProveedor(proveedor.id)
  const productos = todos.filter((p) =>
    enArchivados ? Boolean(p.archivado_at) : !p.archivado_at
  )

  const baseTab = '-mb-px border-b-2 px-4 py-2 text-sm font-medium'
  const tabActiva = `${baseTab} border-orange-500 text-orange-600`
  const tabInactiva = `${baseTab} border-transparent text-gray-500 hover:text-gray-700`

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
      <nav aria-label="Pestañas de productos" className="mb-4 flex gap-1 border-b">
        <Link
          href="/proveedor/productos?tab=productos"
          aria-current={enArchivados ? undefined : 'page'}
          className={enArchivados ? tabInactiva : tabActiva}
        >
          Productos
        </Link>
        <Link
          href="/proveedor/productos?tab=archivados"
          aria-current={enArchivados ? 'page' : undefined}
          className={enArchivados ? tabActiva : tabInactiva}
        >
          Archivados
        </Link>
      </nav>
      <ListaProductosProveedor productos={productos} />
    </div>
  )
}
