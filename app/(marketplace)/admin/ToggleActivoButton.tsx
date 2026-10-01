'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { setProductoActivo } from './actions'

interface Props {
  id: string
  activo: boolean
}

export default function ToggleActivoButton({ id, activo }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await setProductoActivo(id, !activo)
            setError(result?.error ?? null)
          })
        }}
      >
        {pending ? '...' : activo ? 'Desactivar' : 'Activar'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
