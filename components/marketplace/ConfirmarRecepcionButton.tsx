'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { confirmarRecepcion } from '@/app/(marketplace)/cotizaciones/actions'

interface Props {
  cotizacionId: string
}

export default function ConfirmarRecepcionButton({ cotizacionId }: Props) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      size="sm"
      className="bg-teal-600 hover:bg-teal-700 text-white"
      disabled={pending}
      onClick={() => startTransition(() => confirmarRecepcion(cotizacionId))}
    >
      {pending ? 'Confirmando…' : 'Confirmar recepción'}
    </Button>
  )
}