import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProveedorDelUsuario, getCotizacionesDeProveedor } from '@/lib/data'
import { formatNumeroCotizacion } from '@/lib/cotizaciones'
import type { Cotizacion } from '@/types'
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

// Desde «aceptada» en adelante rige la cantidad confirmada; antes de aceptar
// solo existe la cantidad pedida.
const ESTADOS_CONFIRMADOS = ['aceptada', 'despachada', 'recibida', 'cancelada']

/** Importes de la oferta del proveedor, siempre en pesos dominicanos. */
function dineroOferta(valor: number): string {
  return `RD$ ${valor.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
}

/** Fecha de validez (YYYY-MM-DD) como dd/mm/aaaa, sin desfase de zona horaria. */
function fechaValidez(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

/** Fecha de un instante como día calendario en Santo Domingo (d/m/aaaa). */
function fechaEnSantoDomingo(instante: string): string {
  return new Date(instante).toLocaleDateString('es-DO', {
    timeZone: 'America/Santo_Domingo',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

/** Texto del rechazo: autor, fecha local en Santo Domingo y motivo. */
function textoRechazo(cot: {
  rechazada_at?: string | null
  created_at: string
  motivo_rechazo?: string | null
}): string {
  const fecha = fechaEnSantoDomingo(cot.rechazada_at ?? cot.created_at)
  const motivo = cot.motivo_rechazo?.trim() || 'Motivo no especificado.'
  return `Rechazada por el proveedor el ${fecha}: ${motivo}`
}

/** Tarjeta de una cotización con su contenido y acciones de venta existentes. */
function TarjetaCotizacion({ cot }: { cot: Cotizacion }) {
  const items = cot.items ?? []
  const confirmado = ESTADOS_CONFIRMADOS.includes(cot.estado)
  const respondida = cot.estado === 'respondida'
  const tieneOferta = respondida && cot.total_ofertado != null
  const total = items.reduce((sum, i) => {
    const unidades = confirmado ? (i.cantidad_confirmada ?? i.cantidad) : i.cantidad
    return sum + (i.precio_unitario ?? 0) * unidades
  }, 0)

  return (
    <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
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
        {items.map((item) => {
          // Con oferta manda el precio/cantidad ofertados; desde aceptada en
          // adelante, lo confirmado; antes, lo pedido.
          const ofertada = respondida && item.precio_ofertado != null
          const unidades = ofertada
            ? (item.cantidad_ofertada ?? item.cantidad)
            : confirmado
              ? (item.cantidad_confirmada ?? item.cantidad)
              : item.cantidad
          const precioUnitario = ofertada ? item.precio_ofertado : item.precio_unitario
          return (
            <div key={item.id} data-testid="order-item-row" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 text-sm sm:flex-nowrap sm:px-6">
              <div className="min-w-0 flex-1">
                <span className="min-w-0 break-words [overflow-wrap:anywhere] text-gray-700">
                  {item.producto?.nombre ?? item.producto_id}
                </span>
                {confirmado && (
                  <p className="text-xs text-green-700">
                    {`${unidades} de ${item.cantidad} confirmadas`}
                  </p>
                )}
                {confirmado && (
                  <p className="text-xs text-gray-500">
                    {`Pedido: ${item.cantidad}`}
                  </p>
                )}
                {item.sujeta_disponibilidad && item.stock_al_cotizar !== null && (
                  <p className="text-xs text-yellow-700">
                    {`Sujeta a disponibilidad: pediste ${item.cantidad}, hay ${item.stock_al_cotizar}`}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-500">
                {ofertada && item.precio_ofertado != null ? (
                  <>
                    {item.precio_unitario != null && (
                      <span>{`Catálogo: ${dineroOferta(item.precio_unitario)} c/u`}</span>
                    )}
                    <span>{`Oferta: ${dineroOferta(item.precio_ofertado)} c/u`}</span>
                    <span>x{unidades}</span>
                    <span className="font-medium text-gray-700">
                      {dineroOferta(item.precio_ofertado * unidades)}
                    </span>
                  </>
                ) : (
                  <>
                    <span>x{unidades}</span>
                    {precioUnitario != null && (
                      <>
                        <span>{`$${precioUnitario.toLocaleString('es-DO', { minimumFractionDigits: 2 })} c/u`}</span>
                        <span className="font-medium text-gray-700">
                          {`$${(precioUnitario * unidades).toLocaleString('es-DO', {
                            minimumFractionDigits: 2,
                          })}`}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {tieneOferta && (
        <div className="border-t bg-blue-50 px-4 py-3 sm:px-6">
          <p className="text-sm font-medium text-gray-900">Oferta registrada</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
            <span>{`plazo ${cot.plazo_dias ?? 0} días`}</span>
            <span>{`válida hasta ${fechaValidez(cot.valida_hasta ?? '')}`}</span>
          </div>
          {cot.condiciones && (
            <p className="mt-1 break-words [overflow-wrap:anywhere] text-sm text-gray-700">
              {cot.condiciones}
            </p>
          )}
        </div>
      )}

      {confirmado
        ? total > 0 && (
            <div className="flex justify-end px-4 py-3 border-t text-sm font-semibold text-gray-900 sm:px-6">
              {`Total confirmado: $${total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
            </div>
          )
        : tieneOferta
          ? (
              <div className="flex justify-end px-4 py-3 border-t text-sm font-semibold text-gray-900 sm:px-6">
                {`Total ofertado: ${dineroOferta(Number(cot.total_ofertado))}`}
              </div>
            )
          : total > 0 && (
              <div className="flex justify-end px-4 py-3 border-t text-sm font-semibold text-gray-900 sm:px-6">
                {`Total estimado: $${total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
              </div>
            )}

      {cot.estado === 'rechazada' && (
        <div className="border-t bg-red-50 px-4 py-3 sm:px-6">
          <p className="break-words [overflow-wrap:anywhere] text-sm text-red-700">
            {textoRechazo(cot)}
          </p>
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
}

/** Sección de la bandeja con su encabezado y su estado vacío propio. */
function Seccion({ titulo, cotizaciones }: { titulo: string; cotizaciones: Cotizacion[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
      {cotizaciones.length === 0 ? (
        <div className="rounded-2xl bg-white border px-4 py-8 text-center text-sm text-gray-400 sm:px-6">
          Sin cotizaciones en esta sección.
        </div>
      ) : (
        cotizaciones.map((cot) => <TarjetaCotizacion key={cot.id} cot={cot} />)
      )}
    </section>
  )
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
        <div className="space-y-8">
          <Seccion
            titulo="Pendientes de responder"
            cotizaciones={cotizaciones.filter((cot) => cot.estado === 'pendiente')}
          />
          <Seccion
            titulo="Respondidas"
            cotizaciones={cotizaciones.filter((cot) => cot.estado === 'respondida')}
          />
          <Seccion
            titulo="Pedidos en seguimiento"
            cotizaciones={cotizaciones.filter(
              (cot) => cot.estado !== 'pendiente' && cot.estado !== 'respondida'
            )}
          />
        </div>
      )}
    </div>
  )
}
