import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProveedorDelUsuario, getCotizacionesDeProveedor } from '@/lib/data'
import ResponderCotizacionButton from '@/components/marketplace/ResponderCotizacionButton'

const estadoBadge: Record<string, string> = {
  pendiente:  'bg-yellow-100 text-yellow-700',
  respondida: 'bg-blue-100 text-blue-700',
  aceptada:   'bg-green-100 text-green-700',
  rechazada:  'bg-red-100 text-red-700',
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
        <div className="rounded-2xl bg-white border p-12 text-center text-gray-400">
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
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${estadoBadge[cot.estado]}`}>
                      {cot.estado.charAt(0).toUpperCase() + cot.estado.slice(1)}
                    </span>
                    {cot.estado === 'pendiente' && (
                      <ResponderCotizacionButton cotizacionId={cot.id} />
                    )}
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
                  <div className="flex justify-end px-6 py-3 border-t text-sm font-semibold text-gray-900">
                    Total estimado: ${total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
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
