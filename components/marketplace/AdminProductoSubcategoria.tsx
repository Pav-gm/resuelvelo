'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { setProductoSubcategoria } from '@/app/(marketplace)/admin/actions'
import type { Subcategoria } from '@/types'

interface AdminProductoSubcategoriaProps {
  productoId: string
  categoriaId: string
  subcategoriaId: string | null
  subcategorias: Subcategoria[]
}

export default function AdminProductoSubcategoria({
  productoId,
  categoriaId,
  subcategoriaId,
  subcategorias,
}: AdminProductoSubcategoriaProps) {
  const [seleccion, setSeleccion] = useState(subcategoriaId ?? '')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  const opciones = subcategorias.filter((sub) => sub.categoria_id === categoriaId)
  const idSelector = `subcategoria-${productoId}`

  function guardar() {
    setError(null)
    setGuardado(false)
    startTransition(async () => {
      const result = await setProductoSubcategoria(productoId, seleccion)
      if (result && 'error' in result && result.error) {
        setError(result.error)
      } else {
        setGuardado(true)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={idSelector} className="sr-only">
          Subcategoría
        </label>
        <select
          id={idSelector}
          value={seleccion}
          disabled={pending}
          onChange={(e) => setSeleccion(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
        >
          <option value="">Sin subcategoría</option>
          {opciones.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.nombre}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={guardar}>
          {pending ? 'Guardando...' : 'Guardar subcategoría'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {guardado && !error && <p className="text-xs text-green-600">Guardado</p>}
    </div>
  )
}
