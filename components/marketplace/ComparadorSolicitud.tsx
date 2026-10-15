'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { aceptarOfertaDeSolicitud } from '@/app/(marketplace)/cotizaciones/actions'
import { formatearPrecio } from '@/lib/utils'
import type { CotizacionComparador, ItemCotizacion, SolicitudComparador } from '@/types'

type ItemComparador = ItemCotizacion

interface Props {
  data: SolicitudComparador
}

/** ¿La oferta venció? Compara la fecha calendario `valida_hasta` con la de hoy. */
function ofertaVencida(validaHasta: string | null | undefined): boolean {
  if (!validaHasta) return false
  const hoy = new Date()
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
    hoy.getDate()
  ).padStart(2, '0')}`
  return validaHasta.slice(0, 10) < hoyISO
}

/** Etiqueta de una línea de la solicitud: producto, descripción libre o índice. */
function nombreLinea(item: ItemComparador | undefined, indice: number): string {
  const nombre = item?.producto?.nombre?.trim()
  if (nombre) return nombre
  const descripcion = item?.descripcion?.trim()
  if (descripcion) return descripcion
  return `Línea ${indice + 1}`
}

/** Unidades ofertadas: la cantidad ofertada o, si falta, la pedida. */
function unidadesOfertadas(item: ItemComparador): number {
  return item.cantidad_ofertada ?? item.cantidad
}

/** Subtotal de una línea; null cuando el proveedor no la ofertó (no disponible). */
function subtotalDe(item: ItemComparador): number | null {
  if (item.precio_ofertado == null) return null
  return item.precio_ofertado * unidadesOfertadas(item)
}

/** Total ofertado sumando solo las líneas con precio. */
function totalOferta(cotizacion: CotizacionComparador): number {
  return (cotizacion.items ?? []).reduce((total, item) => total + (subtotalDe(item) ?? 0), 0)
}

/** ¿La oferta incluye al menos una línea con precio? */
function tienePrecio(cotizacion: CotizacionComparador): boolean {
  return (cotizacion.items ?? []).some((item) => item.precio_ofertado != null)
}

/** ¿Es una respuesta sin ninguna línea con precio? Se resume como «Sin oferta». */
function sinOferta(cotizacion: CotizacionComparador): boolean {
  return cotizacion.estado === 'respondida' && !tienePrecio(cotizacion)
}

/** Motivo de una oferta hermana cerrada por la elección de otra oferta. */
function motivoEleccion(cotizacion: CotizacionComparador): string | null {
  if (cotizacion.estado !== 'rechazada') return null
  return cotizacion.rechazada_motivo === 'Se eligió otra oferta' ? cotizacion.rechazada_motivo : null
}

/**
 * Comparador del comprador: tabla por proveedor con las líneas alineadas por
 * índice de la solicitud, el total ofertado y los términos. Resalta el total
 * más bajo y el plazo más corto entre las ofertas respondidas con total
 * conocido, y solo para una respuesta vigente ofrece aceptarla de forma
 * excluyente mediante `aceptarOfertaDeSolicitud`.
 */
export default function ComparadorSolicitud({ data }: Props) {
  const { cotizaciones } = data
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Oferta elegida pendiente de confirmación; null cuando no hay diálogo. */
  const [porConfirmar, setPorConfirmar] = useState<CotizacionComparador | null>(null)

  const itemsBase = cotizaciones.find((cot) => (cot.items?.length ?? 0) > 0)?.items ?? []

  const candidatas = cotizaciones.filter((cot) => cot.estado === 'respondida' && tienePrecio(cot))
  const menorTotal =
    candidatas.length >= 2 ? Math.min(...candidatas.map((cot) => totalOferta(cot))) : null
  const plazos = candidatas
    .map((cot) => cot.plazo_dias)
    .filter((plazo): plazo is number => plazo != null)
  const menorPlazo = candidatas.length >= 2 && plazos.length >= 2 ? Math.min(...plazos) : null

  function aceptar(cotizacionId: string) {
    setError(null)
    setPendiente(true)
    startTransition(async () => {
      try {
        const resultado = await aceptarOfertaDeSolicitud(cotizacionId)
        if (resultado?.error) {
          setError(resultado.error)
          return
        }
        setPorConfirmar(null)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo aceptar la oferta.')
      } finally {
        setPendiente(false)
      }
    })
  }

  return (
    <div className="mt-6">
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <caption className="sr-only">
            Comparación de ofertas de la solicitud por proveedor
          </caption>
          <thead>
            <tr className="border-b bg-gray-50">
              <th scope="col" className="px-4 py-3 font-medium text-gray-500">
                Línea
              </th>
              {cotizaciones.map((cot) => {
                const comparable = cot.estado === 'respondida' && tienePrecio(cot)
                const esMenorTotal =
                  comparable && menorTotal !== null && totalOferta(cot) === menorTotal
                const esMenorPlazo = comparable && menorPlazo !== null && cot.plazo_dias === menorPlazo
                return (
                  <th key={cot.id} scope="col" className="px-4 py-3 align-top">
                    <span className="block font-semibold text-gray-900">
                      {cot.proveedor.nombre_empresa}
                    </span>
                    {cot.proveedor.verificado && (
                      <span className="mt-0.5 block text-xs font-medium text-teal-600">
                        Proveedor verificado
                      </span>
                    )}
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {cot.proveedor.conteo_feedback > 0
                        ? `${cot.proveedor.promedio_feedback.toFixed(1)} (${cot.proveedor.conteo_feedback} reseñas)`
                        : 'Sin reseñas'}
                    </span>
                    {esMenorTotal && (
                      <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Total más bajo
                      </span>
                    )}
                    {esMenorPlazo && (
                      <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Plazo más corto
                      </span>
                    )}
                    {sinOferta(cot) && (
                      <span className="mt-1 block text-xs font-medium text-gray-500">Sin oferta</span>
                    )}
                    {motivoEleccion(cot) && (
                      <span className="mt-1 block text-xs font-medium text-red-600">
                        {motivoEleccion(cot)}
                      </span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {itemsBase.map((itemBase, indice) => (
              <tr key={itemBase.id || indice}>
                <th scope="row" className="px-4 py-3 font-normal text-gray-700">
                  {nombreLinea(itemBase, indice)}
                  <span className="ml-1 text-xs text-gray-400">
                    {(() => {
                      // Unidad efectiva: la de la línea o, si falta, la del producto.
                      const unidad =
                        itemBase.unidad?.trim() ||
                        (itemBase.producto as { unidad?: string | null } | null | undefined)?.unidad?.trim()
                      return unidad
                        ? `(${itemBase.cantidad} ${unidad})`
                        : `(${itemBase.cantidad})`
                    })()}
                  </span>
                </th>
                {cotizaciones.map((cot) => {
                  const linea = (cot.items ?? [])[indice] as ItemComparador | undefined
                  const subtotal = linea ? subtotalDe(linea) : null
                  return (
                    <td key={cot.id} className="px-4 py-3 text-gray-700">
                      {cot.estado === 'pendiente' ? (
                        <span className="text-gray-400">Pendiente</span>
                      ) : sinOferta(cot) || motivoEleccion(cot) ? (
                        <span className="text-gray-400">—</span>
                      ) : subtotal === null || linea?.precio_ofertado == null ? (
                        <span className="text-gray-400">No disponible</span>
                      ) : (
                        <>
                          <span>{`${formatearPrecio(linea.precio_ofertado)} c/u`}</span>
                          <span className="ml-2 font-medium text-gray-900">{formatearPrecio(subtotal)}</span>
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-gray-50">
            <tr>
              <th scope="row" className="px-4 py-3 text-gray-500">
                Total ofertado
              </th>
              {cotizaciones.map((cot) => (
                <td key={cot.id} className="px-4 py-3 font-semibold text-gray-900">
                  {cot.estado === 'pendiente'
                    ? 'Pendiente'
                    : sinOferta(cot) || motivoEleccion(cot)
                      ? '—'
                      : formatearPrecio(totalOferta(cot))}
                </td>
              ))}
            </tr>
            <tr className="border-t">
              <th scope="row" className="px-4 py-3 text-gray-500">
                Plazo
              </th>
              {cotizaciones.map((cot) => (
                <td key={cot.id} className="px-4 py-3 text-gray-700">
                  {cot.plazo_dias != null ? `${cot.plazo_dias} días` : '—'}
                </td>
              ))}
            </tr>
            <tr className="border-t">
              <th scope="row" className="px-4 py-3 text-gray-500">
                Válida hasta
              </th>
              {cotizaciones.map((cot) => (
                <td key={cot.id} className="px-4 py-3 text-gray-700">
                  {cot.valida_hasta ? cot.valida_hasta.slice(0, 10) : '—'}
                </td>
              ))}
            </tr>
            {cotizaciones.some((cot) => cot.condiciones) && (
              <tr className="border-t">
                <th scope="row" className="px-4 py-3 text-gray-500">
                  Condiciones
                </th>
                {cotizaciones.map((cot) => (
                  <td
                    key={cot.id}
                    className="px-4 py-3 text-gray-700 [overflow-wrap:anywhere]"
                  >
                    {cot.condiciones || '—'}
                  </td>
                ))}
              </tr>
            )}
            <tr className="border-t">
              <th scope="row" className="px-4 py-3 text-gray-500">
                Decisión
              </th>
              {cotizaciones.map((cot) => {
                const vencida = ofertaVencida(cot.valida_hasta)
                const puedeAceptar = cot.estado === 'respondida' && !vencida
                return (
                  <td key={cot.id} className="px-4 py-3">
                    {puedeAceptar ? (
                      <Button
                        size="sm"
                        className="bg-teal-600 text-white hover:bg-teal-700"
                        disabled={pendiente}
                        onClick={() => {
                          setError(null)
                          setPorConfirmar(cot)
                        }}
                      >
                        Aceptar esta oferta
                      </Button>
                    ) : cot.estado === 'respondida' && vencida ? (
                      <span className="text-sm text-red-600">Oferta vencida</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {porConfirmar && (
        <div
          role="dialog"
          aria-label="Confirmar aceptación de la oferta"
          className="mt-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3"
        >
          <p className="text-sm text-gray-900">
            {`¿Aceptar la oferta de ${porConfirmar.proveedor.nombre_empresa} por ${formatearPrecio(
              totalOferta(porConfirmar)
            )}? Las demás ofertas de esta solicitud se cerrarán.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-teal-600 text-white hover:bg-teal-700"
              disabled={pendiente}
              onClick={() => aceptar(porConfirmar.id)}
            >
              Confirmar aceptación
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pendiente}
              onClick={() => setPorConfirmar(null)}
            >
              Volver
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
