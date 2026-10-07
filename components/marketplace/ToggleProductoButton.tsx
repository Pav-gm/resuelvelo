'use client'

import { Button } from '@/components/ui/button'
import { toggleProducto } from '@/app/(marketplace)/proveedor/actions'
import { useTransition } from 'react'

interface Props {
  id: string
  activo: boolean
}

export default function ToggleProductoButton({ id, activo }: Props) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      size="sm"
      className="min-h-11 sm:min-h-0 sm:h-7"
      disabled={pending}
      onClick={() =>
        startTransition(() => toggleProducto(id, !activo))
      }
    >
      {pending ? '...' : activo ? 'Desactivar' : 'Activar'}
    </Button>
  )
}
