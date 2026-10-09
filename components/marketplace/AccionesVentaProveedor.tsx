'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { despacharCotizacion } from '@/app/(marketplace)/proveedor/actions'
import { cancelarVenta } from '@/app/(marketplace)/cotizaciones/actions'
import type { OpcionMotivoCancelacion } from '@/types'

type Props = {
  cotizacionId: string
  estado: 'aceptada' | 'despachada'
}

type TipoConfirmacion = 'despachar' | 'cancelar' | null

const OPCIONES: OpcionMotivoCancelacion[] = [
  'Ya no lo necesito',
  'Encontré mejor precio',
  'Error en el pedido',
  'Sin stock',
  'Otro',
]

/**
 * Controles de venta del proveedor: despacho (solo aceptada) y cancelación
 * (aceptada o despachada). El despacho y la cancelación exigen confirmación
 * previa; la cancelación además exige un motivo (con detalle si es «Otro»).
 * Los controles se deshabilitan durante la acción y se muestran los errores
 * devueltos por las RPC. «Volver» cierra sin mutación.
 */
type ResultadoAccion = { error: string } | null | void

async function aResultado(accion: () => Promise<ResultadoAccion>): Promise<{ error: string } | null> {
  try {
    const resultado: unknown = await accion()
    if (resultado && typeof resultado === 'object' && 'error' in resultado) {
      return resultado as { error: string }
    }
    return null
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo completar la acción.' }
  }
}

export default function AccionesVentaProveedor({ cotizacionId, estado }: Props) {
  const [, startTransition] = useTransition()
  const [pendiente, setPendiente] = useState(false)
  const [confirmacion, setConfirmacion] = useState<TipoConfirmacion>(null)
  const [error, setError] = useState<string | null>(null)
  const [opcion, setOpcion] = useState<OpcionMotivoCancelacion | ''>('')
  const [detalle, setDetalle] = useState('')

  const puedeConfirmarCancelacion =
    opcion !== '' && (opcion !== 'Otro' || detalle.trim().length > 0)

  function limpiarCancelacion() {
    setOpcion('')
    setDetalle('')
  }

  function ejecutar(accion: () => Promise<ResultadoAccion>, tipo: Exclude<TipoConfirmacion, null>) {
    setError(null)
    setPendiente(true)
    startTransition(async () => {
      try {
        const resultado = await aResultado(accion)
        if (resultado?.error) {
          setError(resultado.error)
          // Un error de cancelación conserva el diálogo, la selección y el detalle.
          if (tipo === 'cancelar') return
        }
        setConfirmacion(null)
        limpiarCancelacion()
      } finally {
        setPendiente(false)
      }
    })
  }

  function confirmarCancelacion() {
    if (opcion === '' || !puedeConfirmarCancelacion) return
    ejecutar(
      () => cancelarVenta(cotizacionId, opcion === 'Otro' ? { opcion, detalle } : { opcion }),
      'cancelar'
    )
  }

  return (
    <div className="border-t bg-gray-50 px-6 py-4" aria-label="Acciones de venta">
      <div className="flex items-center gap-2">
        {estado === 'aceptada' && (
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={pendiente}
            onClick={() => {
              setError(null)
              setConfirmacion('despachar')
            }}
          >
            Marcar como despachada
          </Button>
        )}
        {(estado === 'aceptada' || estado === 'despachada') && (
          <Button
            size="sm"
            variant="outline"
            className="text-red-500 border-red-200 hover:bg-red-50"
            disabled={pendiente}
            onClick={() => {
              setError(null)
              limpiarCancelacion()
              setConfirmacion('cancelar')
            }}
          >
            Cancelar venta
          </Button>
        )}
      </div>

      {confirmacion === 'despachar' && (
        <div
          className="mt-3 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3"
          role="dialog"
          aria-label="Confirmar despacho"
        >
          <p className="text-sm text-gray-900">¿Confirmas que esta venta fue despachada?</p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={pendiente}
              onClick={() => ejecutar(() => despacharCotizacion(cotizacionId), 'despachar')}
            >
              {pendiente ? 'Despachando…' : 'Sí, marcar como despachada'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pendiente}
              onClick={() => setConfirmacion(null)}
            >
              Volver
            </Button>
          </div>
        </div>
      )}

      {confirmacion === 'cancelar' && (
        <div
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
          role="dialog"
          aria-label="Motivo de cancelación"
        >
          <p className="text-sm text-gray-900">
            ¿Seguro que quieres cancelar esta venta? Indica el motivo.
          </p>
          <select
            aria-label="Motivo de cancelación"
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            value={opcion}
            disabled={pendiente}
            onChange={(e) => setOpcion(e.target.value as OpcionMotivoCancelacion | '')}
          >
            <option value="">Selecciona un motivo</option>
            {OPCIONES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {opcion === 'Otro' && (
            <textarea
              aria-label="Describe el motivo"
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              maxLength={500}
              value={detalle}
              disabled={pendiente}
              onChange={(e) => setDetalle(e.target.value)}
            />
          )}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={pendiente || !puedeConfirmarCancelacion}
              onClick={confirmarCancelacion}
            >
              Confirmar cancelación
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pendiente}
              onClick={() => {
                limpiarCancelacion()
                setConfirmacion(null)
              }}
            >
              Volver
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      {error && confirmacion !== 'cancelar' && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}