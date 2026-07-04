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
}

export default function CatalogoFiltros({
  categorias,
  busquedaInicial = '',
  categoriaInicial,
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
