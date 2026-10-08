import Link from 'next/link'
import { Button } from '@/components/ui/button'
import ToggleProductoButton from '@/components/marketplace/ToggleProductoButton'
import EliminarProductoButton from '@/components/marketplace/EliminarProductoButton'
import type { Producto } from '@/types'

interface Props {
  productos: Producto[]
  /**
   * Envuelve la lista en su propia tarjeta. El panel la desactiva para
   * conservar su tarjeta contenedora única («Mis productos» + `divide-y`).
   */
  enTarjeta?: boolean
}

/**
 * Lista de productos del proveedor compartida por el panel y la ruta
 * `/proveedor/productos`. En móvil cada fila envuelve su contenido: el nombre
 * se lee completo (sin `truncate`) y las acciones quedan dentro de la tarjeta.
 * En escritorio conserva la disposición en una sola línea.
 */
export default function ListaProductosProveedor({ productos, enTarjeta = true }: Props) {
  return (
    <div className={enTarjeta ? 'rounded-2xl bg-white border shadow-sm divide-y' : 'divide-y'}>
      {productos.map((p) => (
        <div
          key={p.id}
          data-testid="product-row"
          className="flex flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-6"
        >
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <p className="break-words [overflow-wrap:anywhere] font-medium text-gray-900">
              {p.nombre}
            </p>
            <p className="text-xs text-gray-400">
              ${p.precio.toLocaleString('es-DO', { minimumFractionDigits: 2 })} / {p.unidad} · Stock: {p.stock}
              {p.stock_reservado && p.stock_reservado > 0
                ? ` (${p.stock_reservado} ${p.stock_reservado === 1 ? 'reservada' : 'reservadas'})`
                : ''}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {p.activo ? 'Activo' : 'Inactivo'}
          </span>
          <div data-testid="product-actions" className="flex flex-wrap items-center gap-2">
            <ToggleProductoButton id={p.id} activo={p.activo} />
            <Link href={`/proveedor/productos/${p.id}/editar`}>
              <Button variant="outline" size="sm" className="min-h-11 sm:min-h-0 sm:h-7">Editar</Button>
            </Link>
            <EliminarProductoButton id={p.id} nombre={p.nombre} />
          </div>
        </div>
      ))}
      {productos.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-gray-400 sm:px-6">
          Aún no publicaste productos.{' '}
          <Link href="/proveedor/productos/nuevo" className="text-orange-500 hover:underline">Publicar ahora</Link>
        </p>
      )}
    </div>
  )
}
