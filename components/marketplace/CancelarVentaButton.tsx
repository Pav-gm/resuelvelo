'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { cancelarVenta } from '@/app/(marketplace)/cotizaciones/actions'

/**
 * Cancelación del comprador: solo se ofrece mientras la cotización está
 * aceptada (antes del despacho). Sin confirmación previa según el alcance;
 * se deshabilita durante la acción y muestra los errores de la RPC.
 */
export default function CancelarVentaButton({ cotizacionId }: { cotizacionId: string }) {
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        className="text-red-500 border-red-200 hover:bg-red-50"
        disabled={pendiente}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            try {
              const resultado: unknown = await cancelarVenta(cotizacionId)
              if (
                resultado &&
                typeof resultado === 'object' &&
                'error' in resultado &&
                typeof resultado.error === 'string'
              ) {
                setError(resultado.error)
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo cancelar la venta.')
            }
          })
        }}
      >
        {pendiente ? 'Cancelando…' : 'Cancelar'}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}