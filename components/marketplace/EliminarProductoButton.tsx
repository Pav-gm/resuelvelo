'use client'

import { useState, useTransition } from 'react'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  archivarOEliminarProducto,
  restaurarProducto,
} from '@/app/(marketplace)/proveedor/actions'
import type { ProductoActionResult } from '@/types'

interface Props {
  id: string
  nombre: string
  /** Un producto con cotizaciones no se borra: se archiva para no romper el historial. */
  tieneCotizaciones?: boolean
  /** Un producto archivado solo se puede restaurar. */
  archivado?: boolean
  /**
   * Cuando la acción la usa una lista que sobrevive a la revalidación del
   * servidor, el mensaje de éxito se delega en quien la contiene: la fila
   * desaparece y con ella este botón.
   */
  onExito?: (mensaje: string) => void
}

const MENSAJE_EXITO: Record<'archived' | 'deleted' | 'restored', string> = {
  archived: 'Producto archivado.',
  deleted: 'Producto eliminado.',
  restored: 'Producto restaurado.',
}

export default function EliminarProductoButton({
  id,
  nombre,
  tieneCotizaciones = false,
  archivado = false,
  onExito,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [resultado, setResultado] = useState<ProductoActionResult | null>(null)

  const accion = archivado ? 'Restaurar' : tieneCotizaciones ? 'Archivar' : 'Eliminar'
  const Icono = archivado ? RotateCcw : tieneCotizaciones ? Archive : Trash2
  const confirmacion = archivado
    ? `¿Restaurar "${nombre}"? Volverá a mostrarse en el catálogo.`
    : tieneCotizaciones
      ? `¿Archivar "${nombre}"? Dejará de mostrarse en el catálogo, pero sus cotizaciones conservan su nombre.`
      : `¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`

  function handleAccion() {
    if (!window.confirm(confirmacion)) return
    startTransition(async () => {
      const result = archivado
        ? await restaurarProducto(id)
        : await archivarOEliminarProducto(id)
      // El error siempre se muestra aquí; el éxito se delega a la lista cuando
      // esta puede sobrevivir a la desaparición de la fila.
      if ('error' in result) {
        setResultado(result)
        return
      }
      if (onExito) {
        setResultado(null)
        onExito(MENSAJE_EXITO[result.action])
        return
      }
      setResultado(result)
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={handleAccion}
        className="text-red-500 border-red-200 hover:bg-red-50 min-h-11 sm:min-h-0 sm:h-7"
        aria-label={`${accion} ${nombre}`}
      >
        <Icono className="h-3.5 w-3.5" />
      </Button>
      {resultado &&
        ('error' in resultado ? (
          <span role="alert" className="basis-full text-xs text-red-600 sm:basis-auto">
            {resultado.error}
          </span>
        ) : (
          <span role="status" className="basis-full text-xs text-green-700 sm:basis-auto">
            {MENSAJE_EXITO[resultado.action]}
          </span>
        ))}
    </>
  )
}
