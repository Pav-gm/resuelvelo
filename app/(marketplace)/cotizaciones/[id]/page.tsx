import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCotizacionDetalle, getFeedbackPorCotizacion } from '@/lib/data'
import { formatNumeroCotizacion } from '@/lib/cotizaciones'
import LineaSeguimiento from '@/components/marketplace/LineaSeguimiento'
import ResponderCotizacionButton from '@/components/marketplace/ResponderCotizacionButton'
import AccionesVentaProveedor from '@/components/marketplace/AccionesVentaProveedor'
import CancelarVentaButton from '@/components/marketplace/CancelarVentaButton'
import ConfirmarRecepcionButton from '@/components/marketplace/ConfirmarRecepcionButton'
import FormularioFeedback from '@/components/marketplace/FormularioFeedback'

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

function dinero(valor: number): string {
  return `$${valor.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
}

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
function fechaRechazoEnSantoDomingo(instante: string): string {
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
  const fecha = fechaRechazoEnSantoDomingo(cot.rechazada_at ?? cot.created_at)
  const motivo = cot.motivo_rechazo?.trim() || 'Motivo no especificado.'
  return `Rechazada por el proveedor el ${fecha}: ${motivo}`
}

/**
 * Detalle compartido de una cotización, accesible al comprador dueño y al
 * proveedor destinatario. La autorización real vive en la RPC de lectura
 * (`getCotizacionDetalle`): si el usuario no participa, devuelve null y aquí
 * se muestra 404. Las acciones se renderizan solo para el rol y el estado que
 * las permite, reutilizando los mismos componentes que las tarjetas de lista.
 */
export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const detalle = await getCotizacionDetalle(id)
  if (!detalle) notFound()

  // El usuario autenticado es el comprador o el usuario del proveedor destinatario;
  // la RPC ya garantizó esa participación.
  const esComprador = detalle.comprador_id === user.id

  const feedback = esComprador && detalle.estado === 'recibida'
    ? await getFeedbackPorCotizacion(id)
    : null

  const items = detalle.items ?? []
  const confirmado = ESTADOS_CONFIRMADOS.includes(detalle.estado)
  const respondida = detalle.estado === 'respondida'
  const tieneOferta = respondida && detalle.total_ofertado != null
  const totalConfirmado = items.reduce((sum, i) => {
    const unidades = confirmado ? (i.cantidad_confirmada ?? i.cantidad) : i.cantidad
    return sum + (i.precio_unitario ?? 0) * unidades
  }, 0)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div data-testid="detalle-header" className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-gray-900">
            Cotización #{formatNumeroCotizacion(detalle.numero)}
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            {new Date(detalle.created_at).toLocaleDateString('es-DO', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${estadoBadge[detalle.estado]}`}>
          {detalle.estado.charAt(0).toUpperCase() + detalle.estado.slice(1)}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Proveedor</p>
          <p className="mt-1 break-words font-medium text-gray-900">
            {detalle.proveedor.nombre_empresa}
          </p>
          {detalle.proveedor.ciudad && (
            <p className="break-words text-sm text-gray-500">{detalle.proveedor.ciudad}</p>
          )}
          {detalle.proveedor.verificado && (
            <p className="mt-1 text-xs font-medium text-teal-600">Proveedor verificado</p>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Comprador</p>
          <p className="mt-1 break-words font-medium text-gray-900">{detalle.comprador.nombre}</p>
          <p className="break-words text-sm text-gray-500">{detalle.comprador.email}</p>
          {detalle.comprador.telefono && (
            <p className="break-words text-sm text-gray-500">{detalle.comprador.telefono}</p>
          )}
        </div>
      </div>

      {detalle.mensaje && (
        <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Mensaje</p>
          <p className="mt-1 break-words [overflow-wrap:anywhere] text-gray-700">{detalle.mensaje}</p>
        </div>
      )}

      {detalle.estado === 'rechazada' && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="break-words [overflow-wrap:anywhere] text-sm text-red-700">
            {textoRechazo(detalle)}
          </p>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="divide-y">
          {items.map((item) => {
            const producto = item.producto
            const nombre = producto?.nombre
            // Con oferta manda el precio/cantidad ofertados; desde aceptada en
            // adelante, lo confirmado; antes de responder, lo pedido.
            const ofertada = respondida && item.precio_ofertado != null
            const unidades = ofertada
              ? (item.cantidad_ofertada ?? item.cantidad)
              : confirmado
                ? (item.cantidad_confirmada ?? item.cantidad)
                : item.cantidad
            const precioUnitario = ofertada ? item.precio_ofertado : item.precio_unitario
            const subtotal = precioUnitario != null ? precioUnitario * unidades : null
            return (
              <div
                key={item.id}
                data-testid="detalle-item-row"
                className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2 sm:px-6"
              >
                <div
                  data-testid="detalle-item-nombre"
                  className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]"
                >
                  {nombre && producto?.activo ? (
                    <Link
                      href={`/productos/${producto.id}`}
                      className="break-words [overflow-wrap:anywhere] text-gray-700 hover:underline"
                    >
                      {nombre}
                    </Link>
                  ) : nombre ? (
                    <span className="break-words [overflow-wrap:anywhere] text-gray-700">
                      {nombre}
                    </span>
                  ) : (
                    <span className="break-words [overflow-wrap:anywhere] text-gray-700">
                      {item.producto_id}
                    </span>
                  )}
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
                  <span>x{unidades}</span>
                  {precioUnitario != null && subtotal != null && (
                    <>
                      <span>{ofertada ? dineroOferta(precioUnitario) : dinero(precioUnitario)} c/u</span>
                      <span className="font-medium text-gray-700">
                        {ofertada ? dineroOferta(subtotal) : dinero(subtotal)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
          {items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-400">Sin productos.</p>
          )}
        </div>

        {confirmado
          ? items.length > 0 && (
              <div className="flex justify-end border-t px-4 py-3 text-sm font-semibold text-gray-900 sm:px-6">
                Total confirmado: {dinero(totalConfirmado)}
              </div>
            )
          : tieneOferta
            ? (
                <div className="flex justify-end border-t px-4 py-3 text-sm font-semibold text-gray-900 sm:px-6">
                  Total ofertado: {dineroOferta(Number(detalle.total_ofertado))}
                </div>
              )
            : detalle.total_estimado != null && (
                <div className="flex justify-end border-t px-4 py-3 text-sm font-semibold text-gray-900 sm:px-6">
                  Total estimado: {dinero(Number(detalle.total_estimado))}
                </div>
              )}
      </div>

      {tieneOferta && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
          <p className="text-sm font-medium text-gray-900">
            {`Respondida: ${dineroOferta(Number(detalle.total_ofertado))}, plazo ${detalle.plazo_dias ?? 0} días, válida hasta ${fechaValidez(detalle.valida_hasta ?? '')}`}
          </p>
          {detalle.condiciones && (
            <p className="mt-1 break-words [overflow-wrap:anywhere] text-sm text-gray-700">
              {detalle.condiciones}
            </p>
          )}
        </div>
      )}

      <LineaSeguimiento
        estado={detalle.estado}
        despachadaAt={detalle.despachada_at}
        canceladaPor={detalle.cancelada_por}
        canceladaAt={detalle.cancelada_at}
        canceladaMotivo={detalle.cancelada_motivo}
      />

      {!esComprador && detalle.estado === 'pendiente' && (
        <div className="mt-4">
          <ResponderCotizacionButton cotizacionId={detalle.id} items={items} />
        </div>
      )}

      {!esComprador && (detalle.estado === 'aceptada' || detalle.estado === 'despachada') && (
        <AccionesVentaProveedor cotizacionId={detalle.id} estado={detalle.estado} />
      )}

      {esComprador && detalle.estado === 'aceptada' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-gray-50 px-4 py-4">
          <p className="text-sm text-gray-700">El proveedor aceptó; falta que despache.</p>
          <CancelarVentaButton cotizacionId={detalle.id} />
        </div>
      )}

      {esComprador && detalle.estado === 'despachada' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-gray-50 px-4 py-4">
          <p className="text-sm text-gray-700">El proveedor despachó; confirma cuando la recibas.</p>
          <ConfirmarRecepcionButton cotizacionId={detalle.id} />
        </div>
      )}

      {esComprador && detalle.estado === 'recibida' && (
        <div className="mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <FormularioFeedback cotizacionId={detalle.id} feedback={feedback} />
        </div>
      )}
    </div>
  )
}
