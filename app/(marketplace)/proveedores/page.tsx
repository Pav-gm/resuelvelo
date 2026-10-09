import Link from 'next/link'
import { Building2, MapPin, Package, Clock, MessageCircle, Phone } from 'lucide-react'
import ErrorCarga from '@/components/marketplace/ErrorCarga'
import InsigniaProveedorVerificado from '@/components/marketplace/InsigniaProveedorVerificado'
import { getProveedores } from '@/lib/data'

// Normaliza el número de WhatsApp a dígitos; antepone `1` si son 10 dígitos
// (formato local dominicano) para construir un enlace wa.me válido.
function numeroWhatsApp(valor?: string | null): string | null {
  if (!valor) return null
  const digitos = valor.replace(/\D/g, '')
  if (!digitos) return null
  return digitos.length === 10 ? `1${digitos}` : digitos
}

// Normaliza el teléfono conservando un `+` inicial y quitando espacios.
function numeroTelefono(valor?: string | null): string | null {
  if (!valor) return null
  const limpio = valor.replace(/\s/g, '')
  return limpio || null
}

export const metadata = {
  title: 'Proveedores — Resuélvelo',
  description: 'Conoce a los proveedores de materiales e insumos y cuáles tienen la insignia «Verificado» de Resuélvelo.',
}

export default async function ProveedoresPage() {
  const proveedores = await getProveedores().catch(() => null)

  if (!proveedores) return <ErrorCarga />

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
          {proveedores.map((prov) => {
            const whatsapp = numeroWhatsApp(prov.whatsapp)
            const telefono = numeroTelefono(prov.telefono)
            const zonas = prov.zonas_cobertura ?? []
            return (
            <div key={prov.id} className="rounded-2xl bg-white border shadow-sm p-6 flex flex-col">
              <div className="flex items-start gap-4">
                {prov.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={prov.logo_url}
                    alt={`Logo de ${prov.nombre_empresa}`}
                    className="h-12 w-12 shrink-0 rounded-xl border object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                    <Building2 className="h-6 w-6" aria-label={`Logo de ${prov.nombre_empresa}`} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-semibold text-gray-900 truncate">
                      <Link href={`/proveedores/${prov.id}`} className="hover:underline">
                        {prov.nombre_empresa}
                      </Link>
                    </h2>
                    <InsigniaProveedorVerificado fecha={prov.verificado_at} compacta />
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

              {zonas.length > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Cobertura:</span> {zonas.join(', ')}
                </p>
              )}

              {prov.horario && (
                <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3 text-gray-400" />
                  {prov.horario}
                </p>
              )}

              {(whatsapp || telefono) && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {whatsapp && (
                    <a
                      href={`https://wa.me/${whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  )}
                  {telefono && (
                    <a
                      href={`tel:${telefono}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Phone className="h-4 w-4" />
                      Llamar
                    </a>
                  )}
                </div>
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
            )
          })}
        </div>
      )}
    </div>
  )
}
