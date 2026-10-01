'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { aceptarCotizacion, rechazarCotizacion } from '@/app/(marketplace)/cotizaciones/actions'

interface Props {
  cotizacionId: string
}

export default function ResponderCotizacionButton({ cotizacionId }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function ejecutar(accion: (id: string) => Promise<{ error: string } | null>) {
    setError(null)
    startTransition(async () => {
      const result = await accion(cotizacionId)
      setError(result?.error ?? null)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-green-500 hover:bg-green-600 text-white"
          disabled={pending}
          onClick={() => ejecutar(aceptarCotizacion)}
        >
          {pending ? '...' : 'Aceptar'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-500 border-red-200 hover:bg-red-50"
          disabled={pending}
          onClick={() => ejecutar(rechazarCotizacion)}
        >
          Rechazar
        </Button>
      </div>
      {error && <p className="max-w-xs text-right text-xs text-red-600">{error}</p>}
    </div>
  )
}
