'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { eliminarProducto } from '@/app/(marketplace)/proveedor/actions'

interface Props {
  id: string
  nombre: string
}

export default function EliminarProductoButton({ id, nombre }: Props) {
  const [pending, startTransition] = useTransition()

  function handleEliminar() {
    const confirmado = window.confirm(
      `¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`
    )
    if (!confirmado) return
    startTransition(() => eliminarProducto(id))
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={handleEliminar}
      className="text-red-500 border-red-200 hover:bg-red-50"
      aria-label={`Eliminar ${nombre}`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}
