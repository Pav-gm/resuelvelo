'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { obtenerProductosActivosParaReordenar } from '@/app/(marketplace)/cotizaciones/actions'
import { useCarritoStore } from '@/lib/store/carrito'
import type { ItemCotizacion, Producto } from '@/types'

interface Props {
  items: ItemCotizacion[]
}

/** Nombre visible de una línea que ya no puede volver al carrito. */
function nombreLinea(item: ItemCotizacion): string {
  const nombre = item.producto?.nombre?.trim() || item.descripcion?.trim()
  return nombre || 'un producto'
}

/**
 * Vuelve a pedir las líneas de una cotización: consulta los productos que
 * siguen activos, agrega cada uno con la cantidad solicitada al carrito y abre
 * el drawer. Si alguna línea ya no está disponible, avisa cuáles quedaron fuera.
 * Si la consulta falla, el carrito queda intacto y no se abre.
 */
export default function VolverAPedirButton({ items }: Props) {
  const [cargando, setCargando] = useState(false)
  const [aviso, setAviso] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sinProducto = items.filter((item) => !item.producto_id)

  async function handleClick() {
    if (cargando) return
    setError(null)
    setAviso(null)
    setCargando(true)

    const ids = items
      .map((item) => item.producto_id)
      .filter((id): id is string => typeof id === 'string' && id.trim() !== '')

    try {
      const productosActivos = await obtenerProductosActivosParaReordenar(ids)
      const productoPorId = new Map<string, Producto>(
        productosActivos.map((producto): [string, Producto] => [producto.id, producto])
      )

      // Suma las cantidades de las líneas que comparten el mismo producto activo.
      const cantidades = new Map<string, number>()
      const ausentes: ItemCotizacion[] = [...sinProducto]
      for (const item of items) {
        const productoId = item.producto_id
        if (!productoId || !productoPorId.has(productoId)) {
          if (!sinProducto.includes(item)) ausentes.push(item)
          continue
        }
        cantidades.set(productoId, (cantidades.get(productoId) ?? 0) + item.cantidad)
      }

      const agregar = useCarritoStore.getState().agregar
      for (const [productoId, cantidad] of cantidades) {
        agregar(productoPorId.get(productoId) as Producto, cantidad)
      }

      if (ausentes.length > 0) {
        setAviso(ausentes.map(nombreLinea))
      }

      window.dispatchEvent(new Event('resuelvelo:abrir-carrito'))
    } catch {
      setError('No se pudieron cargar los productos. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={cargando}
        onClick={handleClick}
        className="border-orange-200 text-orange-600 hover:bg-orange-50"
      >
        {cargando ? 'Cargando productos…' : 'Volver a pedir'}
      </Button>

      {aviso && (
        <div role="alert" className="text-xs text-yellow-700">
          <p>Algunas líneas ya no están disponibles y no se agregaron al carrito.</p>
          <p>{`No se agregaron: ${aviso.join(', ')}`}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
