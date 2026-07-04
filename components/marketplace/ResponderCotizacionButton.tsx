'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { responderCotizacion } from '@/app/(marketplace)/cotizaciones/actions'

interface Props {
  cotizacionId: string
}

export default function ResponderCotizacionButton({ cotizacionId }: Props) {
  const [pending, startTransition] = useTransition()

  function handleResponder(estado: 'aceptada' | 'rechazada') {
    startTransition(() => responderCotizacion(cotizacionId, estado))
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        className="bg-green-500 hover:bg-green-600 text-white"
        disabled={pending}
        onClick={() => handleResponder('aceptada')}
      >
        {pending ? '...' : 'Aceptar'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-red-500 border-red-200 hover:bg-red-50"
        disabled={pending}
        onClick={() => handleResponder('rechazada')}
      >
        Rechazar
      </Button>
    </div>
  )
}
