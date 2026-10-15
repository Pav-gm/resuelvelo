'use client'

import { Button } from '@/components/ui/button'
import { toggleProductoConResultado } from '@/app/(marketplace)/proveedor/actions'
import { useState, useTransition } from 'react'

interface Props {
  id: string
  activo: boolean
}

export default function ToggleProductoButton({ id, activo }: Props) {
  const [pending, startTransition] = useTransition()
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)

  function handleClick() {
    const nuevoActivo = !activo
    setAviso(null)
    startTransition(async () => {
      const resultado = await toggleProductoConResultado(id, nuevoActivo)
      if ('error' in resultado) {
        setAviso({ tipo: 'error', texto: resultado.error })
        return
      }
      setAviso({
        tipo: 'exito',
        texto: nuevoActivo ? 'Producto activado.' : 'Producto desactivado.',
      })
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11 sm:min-h-0 sm:h-7"
        disabled={pending}
        onClick={handleClick}
      >
        {pending ? '...' : activo ? 'Desactivar' : 'Activar'}
      </Button>
      {aviso &&
        (aviso.tipo === 'error' ? (
          <span role="alert" className="basis-full text-xs text-red-600 sm:basis-auto">
            {aviso.texto}
          </span>
        ) : (
          <span role="status" className="basis-full text-xs text-green-700 sm:basis-auto">
            {aviso.texto}
          </span>
        ))}
    </>
  )
}
