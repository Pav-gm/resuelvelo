import Link from 'next/link'
import { Building2, MapPin, BadgeCheck, Package } from 'lucide-react'
import { getProveedores } from '@/lib/data'

export const metadata = {
  title: 'Proveedores — Resuélvelo',
  description: 'Conocé a los proveedores verificados de materiales e insumos.',
}

export default async function ProveedoresPage() {
  const proveedores = await getProveedores()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
        <p className="mt-1 text-gray-500">
          {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} en la plataforma
        </p>
      </div>

      {proveedores.length === 0 ? (
        <div className="rounded-2xl bg-white border p-12 text-center text-gray-400">
          <p className="text-lg font-medium">Aún no hay proveedores</p>
          <p className="mt-1 text-sm">Sé el primero en registrarte como proveedor.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proveedores.map((prov) => (
            <div key={prov.id} className="rounded-2xl bg-white border shadow-sm p-6 flex flex-col">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-semibold text-gray-900 truncate">{prov.nombre_empresa}</h2>
                    {prov.verificado && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" aria-label="Verificado" />
                    )}
                  </div>
                  {prov.ciudad && (
                    <p className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="h-3 w-3" />
                      {prov.ciudad}
                    </p>
                  )}
                </div>
              </div>

              {prov.descripcion && (
                <p className="mt-4 text-sm text-gray-500 line-clamp-3 flex-1">{prov.descripcion}</p>
              )}

              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Package className="h-4 w-4 text-gray-400" />
                  {prov.productos_count} producto{prov.productos_count !== 1 ? 's' : ''}
                </span>
                <Link
                  href={`/catalogo?proveedor=${prov.id}`}
                  className="text-sm font-medium text-orange-500 hover:underline"
                >
                  Ver catálogo
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
