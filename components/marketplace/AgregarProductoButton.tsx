'use client'

import { useEffect, useRef, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCarritoStore } from '@/lib/store/carrito'
import type { Producto } from '@/types'

interface AgregarProductoButtonProps {
  producto: Producto
  textoAgregar?: string
}

// Duración del estado «Agregado» tras una adición efectiva.
const AGREGADO_MS = 1500

export default function AgregarProductoButton({
  producto,
  textoAgregar = 'Agregar',
}: AgregarProductoButtonProps) {
  const agregar = useCarritoStore((s) => s.agregar)
  const cantidadEnCarrito = useCarritoStore(
    (s) => s.items.find((i) => i.producto.id === producto.id)?.cantidad ?? 0
  )
  const [agregado, setAgregado] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // Stock disponible: total menos las unidades reservadas.
  const disponible = Math.max(0, producto.stock - (producto.stock_reservado ?? 0))
  const sinStock = disponible <= 0
  const alMaximo = !sinStock && cantidadEnCarrito >= disponible

  function handleAgregar() {
    const antes =
      useCarritoStore.getState().items.find((i) => i.producto.id === producto.id)
        ?.cantidad ?? 0
    agregar(producto)
    const despues =
      useCarritoStore.getState().items.find((i) => i.producto.id === producto.id)
        ?.cantidad ?? 0
    // Solo marcar «Agregado» si la adición cambió el carrito efectivamente
    // y aún no se alcanzó el disponible; al llegar al tope manda «Máximo en carrito».
    if (despues > antes && despues < disponible) {
      setAgregado(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setAgregado(false), AGREGADO_MS)
    }
  }

  return (
    <Button
      size="sm"
      className="h-auto min-h-7 w-full min-w-0 max-w-full justify-center whitespace-normal bg-orange-500 py-1 text-white hover:bg-orange-600 sm:h-7 sm:w-auto sm:whitespace-nowrap sm:py-0"
      disabled={sinStock || alMaximo}
      onClick={handleAgregar}
    >
      <ShoppingCart className="mr-1.5 h-4 w-4 shrink-0" />
      {alMaximo ? 'Máximo en carrito' : agregado ? 'Agregado' : textoAgregar}
    </Button>
  )
}
