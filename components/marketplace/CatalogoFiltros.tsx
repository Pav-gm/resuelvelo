'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Categoria } from '@/types'

interface CatalogoFiltrosProps {
  categorias: Categoria[]
  busquedaInicial?: string
  categoriaInicial?: string
  precioMinInicial?: string
  precioMaxInicial?: string
  conStockInicial?: boolean
}

export default function CatalogoFiltros({
  categorias,
  busquedaInicial = '',
  categoriaInicial,
  precioMinInicial = '',
  precioMaxInicial = '',
  conStockInicial = false,
}: CatalogoFiltrosProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  function handleBusqueda(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const busqueda = (e.currentTarget.elements.namedItem('busqueda') as HTMLInputElement)?.value
    setParam('busqueda', busqueda || undefined)
  }

  function handleCategoria(slug: string | undefined) {
    setParam('categoria', slug)
  }

  function handleFiltrosPrecio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const precioMin = (form.elements.namedItem('precioMin') as HTMLInputElement)?.value.trim()
    const precioMax = (form.elements.namedItem('precioMax') as HTMLInputElement)?.value.trim()
    const conStock = (form.elements.namedItem('conStock') as HTMLInputElement)?.checked

    const params = new URLSearchParams(searchParams.toString())
    if (precioMin) {
      params.set('precioMin', precioMin)
    } else {
      params.delete('precioMin')
    }
    if (precioMax) {
      params.set('precioMax', precioMax)
    } else {
      params.delete('precioMax')
    }
    if (conStock) {
      params.set('conStock', '1')
    } else {
      params.delete('conStock')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleBusqueda} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            name="busqueda"
            type="search"
            defaultValue={busquedaInicial}
            placeholder="Buscar productos, materiales, marcas..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </form>
      </div>

      <form
        onSubmit={handleFiltrosPrecio}
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1 sm:min-w-[140px]">
          <label htmlFor="precioMin" className="text-xs font-medium text-gray-600">
            Precio mínimo (DOP)
          </label>
          <input
            id="precioMin"
            name="precioMin"
            type="number"
            min={0}
            step={1}
            defaultValue={precioMinInicial}
            placeholder="Ej. 200"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1 sm:min-w-[140px]">
          <label htmlFor="precioMax" className="text-xs font-medium text-gray-600">
            Precio máximo (DOP)
          </label>
          <input
            id="precioMax"
            name="precioMax"
            type="number"
            min={0}
            step={1}
            defaultValue={precioMaxInicial}
            placeholder="Ej. 1000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 py-2.5 text-sm text-gray-700">
          <input
            name="conStock"
            type="checkbox"
            defaultChecked={conStockInicial}
            className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400/20"
          />
          Solo con stock
        </label>
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-orange-400 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-100"
        >
          Aplicar filtros
        </button>
      </form>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => handleCategoria(undefined)}
          className={cn(
            'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
            !categoriaInicial
              ? 'border-orange-400 bg-orange-50 text-orange-600'
              : 'border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-500'
          )}
        >
          Todos
        </button>
        {categorias.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoria(cat.slug)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              categoriaInicial === cat.slug
                ? 'border-orange-400 bg-orange-50 text-orange-600'
                : 'border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-500'
            )}
          >
            {cat.icono && <span className="mr-1">{cat.icono}</span>}
            {cat.nombre}
          </button>
        ))}
      </div>
    </>
  )
}
