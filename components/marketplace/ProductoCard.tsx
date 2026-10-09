'use client'

import Link from 'next/link'
import ProductoImagen from '@/components/marketplace/ProductoImagen'
import AgregarProductoButton from '@/components/marketplace/AgregarProductoButton'
import InsigniaProveedorVerificado from '@/components/marketplace/InsigniaProveedorVerificado'
import type { Producto } from '@/types'
import { cn } from '@/lib/utils'

interface ProductoCardProps {
  producto: Producto
  className?: string
}

export default function ProductoCard({ producto, className }: ProductoCardProps) {
  const hrefFicha = `/productos/${producto.id}`
  // Stock disponible: total menos las unidades reservadas.
  const disponible = Math.max(0, producto.stock - (producto.stock_reservado ?? 0))

  return (
    <div className={cn('group rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col', className)}>
      {/* Imagen enlazada a la ficha */}
      <Link
        href={hrefFicha}
        className="relative block aspect-square w-full overflow-hidden rounded-t-xl bg-gray-100"
      >
        <ProductoImagen
          imagenUrl={producto.imagen_url}
          nombre={producto.nombre}
          categoria={producto.categoria}
          className="h-full w-full group-hover:scale-105 transition-transform duration-300"
        />
        {disponible === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">Sin stock</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-orange-500 font-medium">{producto.proveedor?.nombre_empresa ?? 'Proveedor'}</p>
            <InsigniaProveedorVerificado fecha={producto.proveedor?.verificado_at} compacta />
          </div>
          <Link href={hrefFicha}>
            <h3 className="mt-0.5 break-words font-semibold text-gray-900 leading-tight line-clamp-2 [overflow-wrap:anywhere]">{producto.nombre}</h3>
          </Link>
        </div>

        <div className="mt-auto flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900">
              ${producto.precio.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400">/ {producto.unidad}</p>
            <p className="text-xs text-gray-500">Stock disponible: {disponible}</p>
          </div>
          <AgregarProductoButton producto={producto} />
        </div>
      </div>
    </div>
  )
}
