'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Categoria, Subcategoria } from '@/types'
import type { ProveedorConConteo } from '@/lib/data'

export type OrdenCatalogo = 'precio_asc' | 'precio_desc' | 'nombre_asc'

interface CatalogoFiltrosProps {
  categorias: Categoria[]
  subcategorias: Subcategoria[]
  proveedores: ProveedorConConteo[]
  busquedaInicial?: string
  categoriaInicial?: string
  subcategoriaInicial?: string
  proveedorInicialIds?: string[]
  precioMinInicial?: string
  precioMaxInicial?: string
  conStockInicial?: boolean
  ordenInicial?: OrdenCatalogo
}

const ORDEN_OPCIONES: { value: OrdenCatalogo; label: string }[] = [
  { value: 'precio_asc', label: 'Precio: menor a mayor' },
  { value: 'precio_desc', label: 'Precio: mayor a menor' },
  { value: 'nombre_asc', label: 'Nombre: A–Z' },
]

const FILTRO_KEYS = ['busqueda', 'categoria', 'subcategoria', 'proveedor', 'precioMin', 'precioMax', 'conStock'] as const

interface Chip {
  key: (typeof FILTRO_KEYS)[number] | 'proveedor'
  value?: string
  etiqueta: string
}

export default function CatalogoFiltros({
  categorias,
  subcategorias,
  proveedores,
  busquedaInicial = '',
  categoriaInicial,
  subcategoriaInicial,
  proveedorInicialIds = [],
  precioMinInicial = '',
  precioMaxInicial = '',
  conStockInicial = false,
  ordenInicial,
}: CatalogoFiltrosProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [busqueda, setBusqueda] = useState(busquedaInicial)
  const [busquedaPrevia, setBusquedaPrevia] = useState(busquedaInicial)
  if (busquedaInicial !== busquedaPrevia) {
    setBusquedaPrevia(busquedaInicial)
    setBusqueda(busquedaInicial)
  }

  const aplicarBusqueda = useCallback(
    (params: URLSearchParams) => {
      const texto = busqueda.trim()
      if (texto) {
        params.set('busqueda', texto)
      } else {
        params.delete('busqueda')
      }
    },
    [busqueda]
  )

  // La URL que ya se pidió pero que searchParams todavía no refleja: si dos filtros se aplican seguidos
  // (por ejemplo, cambiar el orden y pulsar «Aplicar filtros» enseguida), el segundo parte de ella y no pierde el primero.
  const paramsPendientes = useRef<string | null>(null)
  useEffect(() => {
    paramsPendientes.current = null
  }, [searchParams])

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(paramsPendientes.current ?? searchParams.toString())
      mutate(params)
      paramsPendientes.current = params.toString()
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  function handleBusqueda(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    updateParams(aplicarBusqueda)
  }

  function handleCategoria(slug: string | undefined) {
    updateParams((params) => {
      if (slug) {
        params.set('categoria', slug)
      } else {
        params.delete('categoria')
      }
      params.delete('subcategoria')
    })
  }

  function handleSubcategoria(slug: string) {
    updateParams((params) => {
      if (slug) {
        params.set('subcategoria', slug)
      } else {
        params.delete('subcategoria')
      }
    })
  }

  function handleOrden(orden: string) {
    updateParams((params) => {
      if (orden) {
        params.set('orden', orden)
      } else {
        params.delete('orden')
      }
    })
  }

  function handleProveedor(id: string, checked: boolean) {
    updateParams((params) => {
      const actuales = params.getAll('proveedor')
      const nuevos = checked
        ? Array.from(new Set([...actuales, id]))
        : actuales.filter((valor) => valor !== id)
      params.delete('proveedor')
      for (const valor of nuevos) params.append('proveedor', valor)
    })
  }

  function quitarFiltro(key: Chip['key'], value?: string) {
    updateParams((params) => {
      if (key === 'proveedor' && value) {
        const restantes = params.getAll('proveedor').filter((valor) => valor !== value)
        params.delete('proveedor')
        for (const valor of restantes) params.append('proveedor', valor)
      } else {
        params.delete(key)
        if (key === 'categoria') params.delete('subcategoria')
      }
    })
  }

  function limpiarFiltros() {
    updateParams((params) => {
      for (const key of FILTRO_KEYS) params.delete(key)
    })
  }

  function handleFiltrosPrecio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const precioMin = (form.elements.namedItem('precioMin') as HTMLInputElement)?.value.trim()
    const precioMax = (form.elements.namedItem('precioMax') as HTMLInputElement)?.value.trim()
    const conStock = (form.elements.namedItem('conStock') as HTMLInputElement)?.checked

    updateParams((params) => {
      aplicarBusqueda(params)
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
    })
  }

  const categoriaSeleccionada = categorias.find((cat) => cat.slug === categoriaInicial)
  const subcategoriasDeCategoria = categoriaSeleccionada
    ? subcategorias.filter((sub) => sub.categoria_id === categoriaSeleccionada.id)
    : []

  const chips: Chip[] = []
  if (busquedaInicial) {
    chips.push({ key: 'busqueda', etiqueta: `Búsqueda: ${busquedaInicial}` })
  }
  if (categoriaInicial) {
    chips.push({
      key: 'categoria',
      etiqueta: `Categoría: ${categoriaSeleccionada?.nombre ?? categoriaInicial}`,
    })
  }
  if (subcategoriaInicial) {
    const subcategoria = subcategorias.find((sub) => sub.slug === subcategoriaInicial)
    chips.push({
      key: 'subcategoria',
      etiqueta: `Subcategoría: ${subcategoria?.nombre ?? subcategoriaInicial}`,
    })
  }
  for (const id of proveedorInicialIds) {
    const proveedor = proveedores.find((prov) => prov.id === id)
    chips.push({
      key: 'proveedor',
      value: id,
      etiqueta: `Proveedor: ${proveedor?.nombre_empresa ?? id}`,
    })
  }
  if (precioMinInicial) {
    chips.push({ key: 'precioMin', etiqueta: `Precio mínimo: ${precioMinInicial}` })
  }
  if (precioMaxInicial) {
    chips.push({ key: 'precioMax', etiqueta: `Precio máximo: ${precioMaxInicial}` })
  }
  if (conStockInicial) {
    chips.push({ key: 'conStock', etiqueta: 'Solo con stock' })
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleBusqueda} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            name="busqueda"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar productos, materiales, marcas..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </form>
      </div>

      <form
        key={`${precioMinInicial}|${precioMaxInicial}|${conStockInicial ? '1' : '0'}`}
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

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {categoriaSeleccionada && (
          <div className="flex flex-1 flex-col gap-1 sm:min-w-[200px]">
            <label htmlFor="subcategoria" className="text-xs font-medium text-gray-600">
              Subcategoría
            </label>
            <select
              id="subcategoria"
              name="subcategoria"
              value={subcategoriaInicial ?? ''}
              onChange={(e) => handleSubcategoria(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            >
              <option value="" hidden>
                Todas las subcategorías
              </option>
              {subcategoriasDeCategoria.map((sub) => (
                <option key={sub.id} value={sub.slug}>
                  {sub.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-1 sm:min-w-[200px]">
          <label htmlFor="orden" className="text-xs font-medium text-gray-600">
            Ordenar por
          </label>
          <select
            id="orden"
            name="orden"
            value={ordenInicial ?? 'precio_asc'}
            onChange={(e) => handleOrden(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          >
            {ORDEN_OPCIONES.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {proveedores.length > 0 && (
        <fieldset className="mb-6 rounded-xl border border-gray-200 p-4">
          <legend className="px-1 text-xs font-medium text-gray-600">Proveedores</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {proveedores.map((proveedor) => (
              <label
                key={proveedor.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  name="proveedor"
                  value={proveedor.id}
                  checked={proveedorInicialIds.includes(proveedor.id)}
                  onChange={(e) => handleProveedor(proveedor.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400/20"
                />
                {proveedor.nombre_empresa}
                {typeof proveedor.productos_count === 'number' && (
                  <span className="text-xs text-gray-400">({proveedor.productos_count})</span>
                )}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {chips.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={`${chip.key}-${chip.value ?? ''}`}
              className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 py-1 pl-3 pr-1 text-sm text-orange-700"
            >
              {chip.etiqueta}
              <button
                type="button"
                aria-label={`Quitar filtro ${chip.etiqueta}`}
                onClick={() => quitarFiltro(chip.key, chip.value)}
                className="rounded-full px-1 text-base leading-none text-orange-500 transition-colors hover:bg-orange-100"
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={limpiarFiltros}
            className="rounded-full px-3 py-1 text-sm font-medium text-gray-500 underline-offset-2 transition-colors hover:text-orange-500 hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </>
  )
}
