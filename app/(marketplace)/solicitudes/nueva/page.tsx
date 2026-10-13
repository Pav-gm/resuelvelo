import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCategorias, getProductos, getProveedores } from '@/lib/data'
import ErrorCarga from '@/components/marketplace/ErrorCarga'
import NuevaSolicitudForm from '@/components/marketplace/NuevaSolicitudForm'

export default async function NuevaSolicitudPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const desdeCarrito = params.desde === 'carrito'

  const datos = await Promise.all([
    getCategorias(),
    getProveedores(),
    getProductos(),
  ]).catch(() => null)

  if (!datos) return <ErrorCarga />

  const [categorias, proveedores, productos] = datos

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Nueva solicitud a varios proveedores</h1>
      <p className="mt-1 text-sm text-gray-500">
        Describe las líneas que necesitas y elige hasta cinco proveedores para que te coticen.
      </p>

      <NuevaSolicitudForm
        categorias={categorias}
        proveedores={proveedores}
        productos={productos}
        desdeCarrito={desdeCarrito}
      />
    </div>
  )
}
