'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { confirmarRecepcion } from '@/app/(marketplace)/cotizaciones/actions'

interface Props {
  cotizacionId: string
}

/**
 * Confirmación de recepción del comprador. Si la RPC falla, la acción rechaza y
 * aquí se muestra el mensaje como alerta; nunca falla en silencio.
 */
export default function ConfirmarRecepcionButton({ cotizacionId }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function confirmar() {
    setError(null)
    startTransition(async () => {
      try {
        await confirmarRecepcion(cotizacionId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo confirmar la recepción.')
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        size="sm"
        className="bg-teal-600 hover:bg-teal-700 text-white"
        disabled={pending}
        onClick={confirmar}
      >
        {pending ? 'Confirmando…' : 'Confirmar recepción'}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}