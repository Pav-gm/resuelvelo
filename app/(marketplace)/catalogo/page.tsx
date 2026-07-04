import { Suspense } from 'react'
import ProductoCard from '@/components/marketplace/ProductoCard'
import CatalogoFiltros from '@/components/marketplace/CatalogoFiltros'
import { getCategorias, getProductos } from '@/lib/data'

interface CatalogoPageProps {
  searchParams: Promise<{ busqueda?: string; categoria?: string; proveedor?: string }>
}

export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const params = await searchParams
  const { busqueda, categoria, proveedor } = params

  const [productos, categorias] = await Promise.all([
    getProductos({ busqueda, categoriaSlug: categoria, proveedorId: proveedor }),
    getCategorias(),
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
        busquedaInicial={busqueda}
        categoriaInicial={categoria}
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
