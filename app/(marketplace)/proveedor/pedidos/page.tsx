import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProveedorDelUsuario, getCotizacionesDeProveedor } from '@/lib/data'
import { formatNumeroCotizacion } from '@/lib/cotizaciones'
import { Button } from '@/components/ui/button'
import ResponderCotizacionButton from '@/components/marketplace/ResponderCotizacionButton'
import LineaSeguimiento from '@/components/marketplace/LineaSeguimiento'
import AccionesVentaProveedor from '@/components/marketplace/AccionesVentaProveedor'

const estadoBadge: Record<string, string> = {
  pendiente:  'bg-yellow-100 text-yellow-700',
  respondida: 'bg-blue-100 text-blue-700',
  aceptada:   'bg-green-100 text-green-700',
  rechazada:  'bg-red-100 text-red-700',
  despachada: 'bg-purple-100 text-purple-700',
  recibida:   'bg-teal-100 text-teal-700',
  cancelada:  'bg-gray-200 text-gray-600',
}

export default async function PedidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const proveedor = await getProveedorDelUsuario()
  if (!proveedor) redirect('/register?rol=proveedor')

  const cotizaciones = await getCotizacionesDeProveedor(proveedor.id)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Bandeja de cotizaciones</h1>

      {cotizaciones.length === 0 ? (
        <div className="rounded-2xl bg-white border px-4 py-12 text-center text-gray-400 sm:px-6">
          <p className="text-lg font-medium">Sin cotizaciones</p>
          <p className="mt-1 text-sm">Las solicitudes de los compradores aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cotizaciones.map((cot) => {
            const items = cot.items ?? []
            const total = items.reduce(
              (sum, i) => sum + (i.precio_unitario ?? 0) * i.cantidad,
              0
            )
            return (
              <div key={cot.id} className="rounded-2xl bg-white border shadow-sm overflow-hidden">
                <div data-testid="order-header" className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Cotización #{formatNumeroCotizacion(cot.numero)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(cot.created_at).toLocaleDateString('es-DO', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${estadoBadge[cot.estado]}`}>
                      {cot.estado.charAt(0).toUpperCase() + cot.estado.slice(1)}
                    </span>
                    {cot.estado === 'pendiente' && (
                      <ResponderCotizacionButton cotizacionId={cot.id} items={items} />
                    )}
                    <Link href={`/cotizaciones/${cot.id}`}>
                      <Button variant="outline" size="sm">Ver</Button>
                    </Link>
                  </div>
                </div>

                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} data-testid="order-item-row" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 text-sm sm:flex-nowrap sm:px-6">
                      <div className="min-w-0 flex-1">
                        <span className="min-w-0 break-words [overflow-wrap:anywhere] text-gray-700">
                          {(item as { producto?: { nombre?: string } }).producto?.nombre ?? item.producto_id}
                        </span>
                        {item.sujeta_disponibilidad && item.stock_al_cotizar !== null && (
                          <p className="text-xs text-yellow-700">
                            {`Sujeta a disponibilidad: pediste ${item.cantidad}, hay ${item.stock_al_cotizar}`}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-500">
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

                {total > 0 && (
                  <div className="flex justify-end px-4 py-3 border-t text-sm font-semibold text-gray-900 sm:px-6">
                    Total estimado: ${total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </div>
                )}

                <LineaSeguimiento
                  estado={cot.estado}
                  despachadaAt={cot.despachada_at}
                  canceladaPor={cot.cancelada_por}
                  canceladaAt={cot.cancelada_at}
                  canceladaMotivo={cot.cancelada_motivo}
                />

                {/* Despacho y cancelación en aceptada; solo cancelación en despachada. */}
                {(cot.estado === 'aceptada' || cot.estado === 'despachada') && (
                  <AccionesVentaProveedor cotizacionId={cot.id} estado={cot.estado} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
