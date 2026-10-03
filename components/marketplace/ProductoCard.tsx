'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ShoppingCart, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCarritoStore } from '@/lib/store/carrito'
import type { Producto } from '@/types'
import { cn } from '@/lib/utils'

interface ProductoCardProps {
  producto: Producto
  className?: string
}

// Duración del estado «Agregado» tras una adición efectiva.
const AGREGADO_MS = 1500

export default function ProductoCard({ producto, className }: ProductoCardProps) {
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

  const sinStock = producto.stock <= 0
  const alMaximo = !sinStock && cantidadEnCarrito >= producto.stock

  function handleAgregar() {
    const antes =
      useCarritoStore.getState().items.find((i) => i.producto.id === producto.id)
        ?.cantidad ?? 0
    agregar(producto)
    const despues =
      useCarritoStore.getState().items.find((i) => i.producto.id === producto.id)
        ?.cantidad ?? 0
    // Solo marcar «Agregado» si la adición cambió el carrito efectivamente
    // y aún no se alcanzó el stock; al llegar al stock manda «Máximo en carrito».
    if (despues > antes && despues < producto.stock) {
      setAgregado(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setAgregado(false), AGREGADO_MS)
    }
  }

  return (
    <div className={cn('group rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col', className)}>
      {/* Imagen */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-gray-100">
        {producto.imagen_url ? (
          <Image
            src={producto.imagen_url}
            alt={producto.nombre}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-12 w-12 text-gray-300" />
          </div>
        )}
        {producto.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">Sin stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <p className="text-xs text-orange-500 font-medium">{producto.proveedor?.nombre_empresa ?? 'Proveedor'}</p>
          <h3 className="mt-0.5 font-semibold text-gray-900 leading-tight line-clamp-2">{producto.nombre}</h3>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">
              ${producto.precio.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400">/ {producto.unidad}</p>
          </div>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={sinStock || alMaximo}
            onClick={handleAgregar}
          >
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            {alMaximo ? 'Máximo en carrito' : agregado ? 'Agregado' : 'Agregar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
