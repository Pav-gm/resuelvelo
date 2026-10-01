import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCotizacionesDelComprador } from '@/lib/data'
import LimpiarCarritoEnEnviada from '@/components/marketplace/LimpiarCarritoEnEnviada'
import SeguimientoVentaButtons from '@/components/marketplace/SeguimientoVentaButtons'
import { ESTADO_BADGE, ESTADO_LABEL } from '@/lib/cotizacion-estado'

export default async function MisCotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ enviada?: string; parcial?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const cotizaciones = await getCotizacionesDelComprador(user.id)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Mis cotizaciones</h1>
      <p className="mb-6 text-sm text-gray-500">Seguimiento de tus solicitudes a proveedores.</p>

      {params.enviada && (
        <>
          <LimpiarCarritoEnEnviada />
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            ¡Cotización enviada con éxito! El proveedor la revisará pronto.
          </div>
          {params.parcial && (
            <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
              Algunos productos del carrito ya no estaban disponibles y no se incluyeron en la cotización.
            </div>
          )}
        </>
      )}

      {cotizaciones.length === 0 ? (
        <div className="rounded-2xl bg-white border p-12 text-center text-gray-400">
          <p className="text-lg font-medium">Sin cotizaciones</p>
          <p className="mt-1 text-sm">Agrega productos al carrito y envía tu primera solicitud.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cotizaciones.map((cot) => {
            const items = cot.items ?? []
            return (
              <div key={cot.id} className="rounded-2xl bg-white border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Cotización #{cot.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(cot.created_at).toLocaleDateString('es-DO', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTADO_BADGE[cot.estado]}`}>
                      {ESTADO_LABEL[cot.estado]}
                    </span>
                    <SeguimientoVentaButtons
                      cotizacionId={cot.id}
                      estado={cot.estado}
                      rol="comprador"
                    />
                  </div>
                </div>

                {cot.estado === 'aceptada' && (
                  <p className="px-6 py-2 text-xs text-amber-800 bg-amber-50">
                    El proveedor reservó este stock. Puedes cancelar mientras no lo despache.
                  </p>
                )}
                {cot.estado === 'despachada' && (
                  <p className="px-6 py-2 text-xs text-blue-800 bg-blue-50">
                    El pedido va en camino. Confirma cuando lo recibas para cerrar la venta.
                  </p>
                )}

                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-6 py-3 text-sm">
                      <span className="text-gray-700">
                        {(item as { producto?: { nombre?: string } }).producto?.nombre ?? item.producto_id}
                      </span>
                      <div className="flex items-center gap-4 text-gray-500">
                        <span>x{item.cantidad}</span>
                        {item.precio_unitario != null && (
                          <span className="font-medium text-gray-700">
                            ${(item.precio_unitario * item.cantidad).toLocaleString('es-DO', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {cot.total_estimado != null && (
                  <div className="flex justify-end px-6 py-3 border-t text-sm font-semibold text-gray-900">
                    Total estimado: ${Number(cot.total_estimado).toLocaleString('es-DO', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
