import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCotizacionesDelComprador, getFeedbackPorCotizacion } from '@/lib/data'
import { formatNumeroCotizacion } from '@/lib/cotizaciones'
import type { Feedback } from '@/types'
import LimpiarCarritoEnEnviada from '@/components/marketplace/LimpiarCarritoEnEnviada'
import FormularioFeedback from '@/components/marketplace/FormularioFeedback'
import ConfirmarRecepcionButton from '@/components/marketplace/ConfirmarRecepcionButton'
import LineaSeguimiento from '@/components/marketplace/LineaSeguimiento'
import CancelarVentaButton from '@/components/marketplace/CancelarVentaButton'
import AccionesOfertaComprador from '@/components/marketplace/AccionesOfertaComprador'

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

// Estados en los que la cotización conserva una oferta del proveedor que el
// comprador debe seguir viendo, también después de aceptar.
const ESTADOS_CON_OFERTA = ['respondida', 'aceptada', 'despachada', 'recibida']

/** Importes de la oferta del proveedor, siempre en pesos dominicanos. */
function dineroOferta(valor: number): string {
  return `RD$ ${valor.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
}

/** Fecha de validez (YYYY-MM-DD) como dd/mm/aaaa, sin desfase de zona horaria. */
function fechaValidez(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

/**
 * ¿La oferta venció? Se compara la fecha calendario `valida_hasta` (ISO) con la
 * fecha local actual sin convertir la fecha a otro huso horario.
 */
function ofertaVencida(validaHasta: string | null | undefined): boolean {
  if (!validaHasta) return false
  const hoy = new Date()
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
    hoy.getDate()
  ).padStart(2, '0')}`
  return validaHasta.slice(0, 10) < hoyISO
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
  rechazada_motivo?: string | null
}): string {
  const fecha = fechaEnSantoDomingo(cot.rechazada_at ?? cot.created_at)
  const motivoComprador = cot.rechazada_motivo?.trim()
  if (motivoComprador) {
    return `Rechazada por el comprador el ${fecha}: ${motivoComprador}`
  }
  const motivo = cot.motivo_rechazo?.trim() || 'Motivo no especificado.'
  return `Rechazada por el proveedor el ${fecha}: ${motivo}`
}

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

  // Solo las cotizaciones `recibida` pueden mostrar la acción de feedback
  // (una reseña por cotización); se resuelve en servidor por contrato.
  const feedbackPorCotizacion = new Map<string, Feedback | null>()
  await Promise.all(
    cotizaciones
      .filter((cot) => cot.estado === 'recibida')
      .map(async (cot) => {
        feedbackPorCotizacion.set(cot.id, await getFeedbackPorCotizacion(cot.id))
      })
  )

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
            const confirmado = ESTADOS_CONFIRMADOS.includes(cot.estado)
            const respondida = cot.estado === 'respondida'
            const tieneOferta =
              ESTADOS_CON_OFERTA.includes(cot.estado) && cot.total_ofertado != null
            const vencida = respondida && tieneOferta && ofertaVencida(cot.valida_hasta)
            const totalConfirmado = items.reduce((sum, i) => {
              const unidades = confirmado ? (i.cantidad_confirmada ?? i.cantidad) : i.cantidad
              return sum + (i.precio_unitario ?? 0) * unidades
            }, 0)
            return (
              <div key={cot.id} className="rounded-2xl bg-white border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
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
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${estadoBadge[cot.estado]}`}>
                      {cot.estado.charAt(0).toUpperCase() + cot.estado.slice(1)}
                    </span>
                    {cot.estado === 'despachada' && (
                      <ConfirmarRecepcionButton cotizacionId={cot.id} />
                    )}
                    <Link
                      href={`/cotizaciones/${cot.id}`}
                      className="text-sm font-medium text-teal-600 hover:underline"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </div>

                <div className="divide-y">
                  {items.map((item) => {
                    // El comprador nunca debe ver el id interno: si la relación
                    // con el producto falta (o el nombre viene vacío) mostramos
                    // un texto de indisponibilidad.
                    const nombreProducto = item.producto?.nombre?.trim()
                    // Con oferta manda el precio ofertado; desde aceptada en
                    // adelante rige la cantidad confirmada; antes, lo pedido.
                    const ofertada = tieneOferta && item.precio_ofertado != null
                    const unidades = confirmado
                      ? (item.cantidad_confirmada ?? item.cantidad)
                      : ofertada
                        ? (item.cantidad_ofertada ?? item.cantidad)
                        : item.cantidad
                    const precioUnitario = ofertada ? item.precio_ofertado : item.precio_unitario
                    return (
                      <div key={item.id} className="flex items-center justify-between px-6 py-3 text-sm">
                        <div className="min-w-0">
                          <span className="text-gray-700">
                            {nombreProducto || 'Producto no disponible'}
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
                        <div className="flex items-center gap-4 text-gray-500">
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
                                <span className="font-medium text-gray-700">
                                  {`$${(precioUnitario * unidades).toLocaleString('es-DO', {
                                    minimumFractionDigits: 2,
                                  })}`}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {tieneOferta && (
                  <div className="border-t bg-blue-50 px-6 py-3">
                    <p className="text-sm font-medium text-gray-900">Oferta del proveedor</p>
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
                  ? items.length > 0 &&
                    (tieneOferta ? (
                      <div className="flex justify-end px-6 py-3 border-t text-sm font-semibold text-gray-900">
                        {`Total ofertado: ${dineroOferta(Number(cot.total_ofertado))}`}
                      </div>
                    ) : (
                      <div className="flex justify-end px-6 py-3 border-t text-sm font-semibold text-gray-900">
                        Total confirmado: ${totalConfirmado.toLocaleString('es-DO', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    ))
                  : tieneOferta
                    ? (
                        <>
                          {cot.total_estimado != null && (
                            <div className="flex justify-end px-6 py-3 border-t text-sm font-semibold text-gray-900">
                              {`Total estimado: $${Number(cot.total_estimado).toLocaleString('es-DO', {
                                minimumFractionDigits: 2,
                              })}`}
                            </div>
                          )}
                          <div className="flex justify-end px-6 py-3 border-t text-sm font-semibold text-gray-900">
                            {`Total ofertado: ${dineroOferta(Number(cot.total_ofertado))}`}
                          </div>
                        </>
                      )
                    : cot.total_estimado != null && (
                        <div className="flex justify-end px-6 py-3 border-t text-sm font-semibold text-gray-900">
                          Total estimado: ${Number(cot.total_estimado).toLocaleString('es-DO', {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      )}

                {cot.estado === 'rechazada' && (
                  <div className="border-t bg-red-50 px-6 py-3">
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

                {cot.estado === 'respondida' && (
                  <div className="border-t px-6 py-4">
                    <AccionesOfertaComprador cotizacionId={cot.id} vencida={vencida} />
                  </div>
                )}

                {/* El comprador espera el despacho y solo puede cancelar mientras está aceptada. */}
                {cot.estado === 'aceptada' && (
                  <div className="flex flex-col items-stretch gap-4 border-t bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 text-sm text-gray-700">El proveedor aceptó; falta que despache.</p>
                    <CancelarVentaButton cotizacionId={cot.id} />
                  </div>
                )}

                {cot.estado === 'recibida' && (
                  <FormularioFeedback
                    cotizacionId={cot.id}
                    feedback={feedbackPorCotizacion.get(cot.id) ?? null}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
