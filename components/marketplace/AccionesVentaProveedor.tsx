'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { despacharCotizacion } from '@/app/(marketplace)/proveedor/actions'
import { cancelarVenta } from '@/app/(marketplace)/cotizaciones/actions'

type Props = {
  cotizacionId: string
  estado: 'aceptada' | 'despachada'
}

type TipoConfirmacion = 'despachar' | 'cancelar' | null

/**
 * Controles de venta del proveedor: despacho (solo aceptada) y cancelación
 * (aceptada o despachada). Ambos exigen confirmación previa, se deshabilitan
 * durante la acción y muestran los errores devueltos por las RPC.
 */
export default function AccionesVentaProveedor({ cotizacionId, estado }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [confirmacion, setConfirmacion] = useState<TipoConfirmacion>(null)
  const [error, setError] = useState<string | null>(null)

  function ejecutar(accion: () => Promise<{ error: string } | null>) {
    setError(null)
    startTransition(async () => {
      const resultado = await accion()
      if (resultado?.error) {
        setError(resultado.error)
      }
      setConfirmacion(null)
    })
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
        <Button
          size="sm"
          variant="outline"
          className="text-red-500 border-red-200 hover:bg-red-50"
          disabled={pendiente}
          onClick={() => {
            setError(null)
            setConfirmacion('cancelar')
          }}
        >
          Cancelar venta
        </Button>
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
              onClick={() =>
                ejecutar(async () => {
                  // despacharCotizacion propaga los errores de la RPC como
                  // excepción; se capturan aquí para mostrarlos en pantalla.
                  try {
                    await despacharCotizacion(cotizacionId)
                    return null
                  } catch (e) {
                    return {
                      error: e instanceof Error
                        ? e.message
                        : 'No se pudo marcar como despachada.',
                    }
                  }
                })
              }
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
          aria-label="Confirmar cancelación"
        >
          <p className="text-sm text-gray-900">
            ¿Seguro que quieres cancelar esta venta? Esta acción no se puede deshacer.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={pendiente}
              onClick={() => ejecutar(() => cancelarVenta(cotizacionId))}
            >
              {pendiente ? 'Cancelando…' : 'Sí, cancelar venta'}
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

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}