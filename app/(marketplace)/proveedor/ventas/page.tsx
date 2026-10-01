import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProveedorDelUsuario, getVentasDeProveedor } from '@/lib/data'
import { ESTADO_BADGE, ESTADO_LABEL } from '@/lib/cotizacion-estado'
import SeguimientoVentaButtons from '@/components/marketplace/SeguimientoVentaButtons'
import { fechaConfirmacionProveedor, proveedorPuedeConfirmarRecepcion } from '@/lib/stock'

const notaEstado: Record<string, string> = {
  aceptada: 'El stock está reservado. Despacha cuando salga el pedido, o cancela para liberarlo.',
  despachada: 'El cliente puede marcarla como recibida en cuanto le llegue. Si no lo hace, tú puedes hacerlo 7 días después del despacho. Mientras tanto el stock sigue reservado.',
  recibida: 'La venta quedó cerrada y el stock ya se descontó.',
  cancelada: 'La reserva se liberó. El stock físico no se descontó.',
}

function notaRecepcion(cot: { estado: string; recibida_por?: string | null }) {
  if (cot.estado !== 'recibida') return notaEstado[cot.estado]
  if (cot.recibida_por === 'proveedor') {
    return 'Marcaste esta venta como recibida porque el cliente no lo hizo en 7 días. El stock ya se descontó.'
  }
  if (cot.recibida_por === 'comprador') {
    return 'El cliente marcó el pedido como recibido. El stock ya se descontó.'
  }
  return notaEstado.recibida
}

export default async function VentasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const proveedor = await getProveedorDelUsuario()
  if (!proveedor) redirect('/register?rol=proveedor')

  const ventas = await getVentasDeProveedor(proveedor.id)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seguimiento de ventas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Aceptar una cotización reserva el stock. Se descuenta cuando el cliente marca el pedido como recibido, o cuando tú lo haces 7 días después del despacho.
          </p>
        </div>
        <Link href="/proveedor/pedidos" className="shrink-0 text-sm font-medium text-orange-500 hover:underline">
          Bandeja de cotizaciones
        </Link>
      </div>

      {ventas.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-gray-400">
          <p className="text-lg font-medium">Sin ventas en seguimiento</p>
          <p className="mt-1 text-sm">Cuando aceptes una cotización, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ventas.map((cot) => {
            const items = cot.items ?? []
            const puedeConfirmar = cot.estado === 'despachada' && proveedorPuedeConfirmarRecepcion(cot.despachada_at)
            const confirmarProveedorEl = cot.despachada_at
              ? fechaConfirmacionProveedor(cot.despachada_at).toLocaleDateString('es-DO', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })
              : null
            const total = items.reduce(
              (sum, i) => sum + (i.precio_unitario ?? 0) * i.cantidad,
              0
            )
            return (
              <div key={cot.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Venta #{cot.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(cot.created_at).toLocaleDateString('es-DO', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{notaRecepcion(cot)}</p>
                    {cot.estado === 'cancelada' && cot.cancelada_por && (
                      <p className="mt-1 text-xs text-gray-400">
                        Cancelada por el {cot.cancelada_por === 'comprador' ? 'cliente' : 'proveedor'}.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTADO_BADGE[cot.estado]}`}>
                      {ESTADO_LABEL[cot.estado]}
                    </span>
                    <SeguimientoVentaButtons
                      cotizacionId={cot.id}
                      estado={cot.estado}
                      rol="proveedor"
                      puedeConfirmarRecepcion={puedeConfirmar}
                      confirmarProveedorEl={confirmarProveedorEl}
                    />
                  </div>
                </div>

                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-6 py-3 text-sm">
                      <span className="text-gray-700">
                        {(item as { producto?: { nombre?: string } }).producto?.nombre ?? item.producto_id}
                      </span>
                      <div className="flex items-center gap-6 text-gray-500">
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
                  <div className="flex justify-end border-t px-6 py-3 text-sm font-semibold text-gray-900">
                    Total: ${total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
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
