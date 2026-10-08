'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { cancelarVenta } from '@/app/(marketplace)/cotizaciones/actions'
import type { OpcionMotivoCancelacion } from '@/types'

const OPCIONES: OpcionMotivoCancelacion[] = [
  'Ya no lo necesito',
  'Encontré mejor precio',
  'Error en el pedido',
  'Sin stock',
  'Otro',
]

/**
 * Cancelación del comprador: solo se ofrece mientras la cotización está
 * aceptada (antes del despacho). Abre un diálogo que exige un motivo antes de
 * llamar a la acción; cerrar con «Volver» no cambia nada. Se deshabilita
 * durante la acción, cierra el diálogo en éxito, lo mantiene abierto con el
 * error de la RPC y muestra los errores.
 */
export default function CancelarVentaButton({ cotizacionId }: { cotizacionId: string }) {
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [opcion, setOpcion] = useState<OpcionMotivoCancelacion | ''>('')
  const [detalle, setDetalle] = useState('')

  const puedeConfirmar = opcion !== '' && (opcion !== 'Otro' || detalle.trim().length > 0)

  function cerrar() {
    setAbierto(false)
    setOpcion('')
    setDetalle('')
    setError(null)
  }

  function confirmar() {
    if (!puedeConfirmar) return
    setError(null)
    startTransition(async () => {
      try {
        const resultado: unknown = await cancelarVenta(
          cotizacionId,
          opcion === 'Otro' ? { opcion, detalle } : { opcion }
        )
        if (
          resultado &&
          typeof resultado === 'object' &&
          'error' in resultado &&
          typeof resultado.error === 'string'
        ) {
          setError(resultado.error)
          return
        }
        cerrar()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cancelar la venta.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          className="text-red-500 border-red-200 hover:bg-red-50"
          disabled={pendiente}
          onClick={() => {
            setError(null)
            setAbierto(true)
          }}
        >
          Cancelar
        </Button>
      </div>

      {abierto && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3"
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
              disabled={pendiente || !puedeConfirmar}
              onClick={confirmar}
            >
              Confirmar cancelación
            </Button>
            <Button size="sm" variant="outline" disabled={pendiente} onClick={cerrar}>
              Volver
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}