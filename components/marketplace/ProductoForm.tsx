'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { crearProducto, actualizarProducto } from '@/app/(marketplace)/proveedor/actions'
import type { Categoria, Producto } from '@/types'

interface ProductoFormProps {
  categorias: Categoria[]
  producto?: Producto
}

export default function ProductoForm({ categorias, producto }: ProductoFormProps) {
  const action = producto ? actualizarProducto : crearProducto
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-5 rounded-2xl bg-white border p-6 shadow-sm">
      {producto && <input type="hidden" name="id" value={producto.id} />}

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del producto <span className="text-red-500">*</span>
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          defaultValue={producto?.nombre}
          placeholder="Ej: Tubo PVC 4'' sanitario"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
        />
      </div>

      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={3}
          defaultValue={producto?.descripcion ?? ''}
          placeholder="Detalles del producto..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 resize-none"
        />
      </div>

      <div>
        <label htmlFor="categoria_id" className="block text-sm font-medium text-gray-700 mb-1">
          Categoría <span className="text-red-500">*</span>
        </label>
        <select
          id="categoria_id"
          name="categoria_id"
          required
          defaultValue={producto?.categoria_id}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 bg-white"
        >
          <option value="">Seleccionar categoría</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">
            Precio (RD$) <span className="text-red-500">*</span>
          </label>
          <input
            id="precio"
            name="precio"
            type="number"
            required
            min={0}
            step="0.01"
            defaultValue={producto?.precio}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </div>

        <div>
          <label htmlFor="unidad" className="block text-sm font-medium text-gray-700 mb-1">
            Unidad <span className="text-red-500">*</span>
          </label>
          <input
            id="unidad"
            name="unidad"
            type="text"
            required
            defaultValue={producto?.unidad ?? 'unidad'}
            placeholder="unidad, saco, rollo..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
          Stock disponible <span className="text-red-500">*</span>
        </label>
        <input
          id="stock"
          name="stock"
          type="number"
          required
          min={0}
          defaultValue={producto?.stock ?? 0}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
      >
        {pending
          ? 'Guardando...'
          : producto
          ? 'Actualizar producto'
          : 'Publicar producto'}
      </Button>
    </form>
  )
}
