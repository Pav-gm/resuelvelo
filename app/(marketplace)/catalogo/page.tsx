import { Suspense } from 'react'
import ProductoCard from '@/components/marketplace/ProductoCard'
import CatalogoFiltros, { type OrdenCatalogo } from '@/components/marketplace/CatalogoFiltros'
import { getCategorias, getProductos, getProveedores, getSubcategorias } from '@/lib/data'

interface CatalogoPageProps {
  searchParams: Promise<{
    busqueda?: string
    categoria?: string
    subcategoria?: string
    proveedor?: string | string[]
    precioMin?: string
    precioMax?: string
    conStock?: string
    orden?: string
  }>
}

const ORDENES: readonly OrdenCatalogo[] = ['precio_asc', 'precio_desc', 'nombre_asc']

function parsePrecioParam(value?: string): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

function parseOrden(value?: string): OrdenCatalogo {
  return ORDENES.includes(value as OrdenCatalogo) ? (value as OrdenCatalogo) : 'precio_asc'
}

export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const params = await searchParams
  const { busqueda, categoria, subcategoria, proveedor, precioMin, precioMax, conStock } = params

  const proveedorIds = proveedor
    ? Array.isArray(proveedor)
      ? proveedor
      : [proveedor]
    : undefined
  const orden = parseOrden(params.orden)

  const [productos, categorias, subcategorias, proveedores] = await Promise.all([
    getProductos({
      busqueda,
      categoriaSlug: categoria,
      subcategoriaSlug: subcategoria,
      proveedorIds,
      precioMin: parsePrecioParam(precioMin),
      precioMax: parsePrecioParam(precioMax),
      conStock: conStock === '1' ? true : undefined,
      orden,
    }),
    getCategorias(),
    getSubcategorias(),
    getProveedores(),
  ])

  const proveedoresUnicos = new Set(productos.map((p) => p.proveedor_id)).size

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Catálogo de productos</h1>
        <p className="mt-1 text-gray-500">
          {productos.length} producto{productos.length !== 1 ? 's' : ''} de {proveedoresUnicos} proveedor{proveedoresUnicos !== 1 ? 'es' : ''}
        </p>
      </div>

      <CatalogoFiltros
        categorias={categorias}
        subcategorias={subcategorias}
        proveedores={proveedores}
        busquedaInicial={busqueda}
        categoriaInicial={categoria}
        subcategoriaInicial={subcategoria}
        proveedorInicialIds={proveedorIds}
        precioMinInicial={precioMin}
        precioMaxInicial={precioMax}
        conStockInicial={conStock === '1'}
        ordenInicial={orden}
      />

      <Suspense fallback={<GridSkeleton />}>
        {productos.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <p className="text-lg font-medium">Sin resultados</p>
            <p className="mt-1 text-sm">Intenta con otra búsqueda o categoría.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {productos.map((producto) => (
              <ProductoCard key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </Suspense>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-64 rounded-xl bg-gray-100 animate-pulse" />
      ))}
    </div>
  )
}
