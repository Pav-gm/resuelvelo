import { Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProductoCard from '@/components/marketplace/ProductoCard'
import type { Producto } from '@/types'

// Datos mock para el POC — reemplazar con query a Supabase
// p1 = Promeria (plomería), p2 = Ferretería López (electricidad/ferretería), p3 = Materiales del Norte (construcción)
const PRODUCTOS_MOCK: Producto[] = [
  // Promeria — plomería
  {
    id: '1', proveedor_id: 'p1', categoria_id: 'c3',
    nombre: 'Tubo PVC 4" x 6m (sanitario)',
    descripcion: 'Tubería PVC sanitaria cédula 40, para sistemas de desagüe y alcantarillado.',
    precio: 680, unidad: 'unidad', stock: 120, activo: true, created_at: '',
    proveedor: { id: 'p1', user_id: 'u1', nombre_empresa: 'Promeria', verificado: true, created_at: '' },
  },
  {
    id: '2', proveedor_id: 'p1', categoria_id: 'c3',
    nombre: 'Tubo PVC 1/2" x 6m (presión)',
    precio: 180, unidad: 'unidad', stock: 350, activo: true, created_at: '',
    proveedor: { id: 'p1', user_id: 'u1', nombre_empresa: 'Promeria', verificado: true, created_at: '' },
  },
  {
    id: '3', proveedor_id: 'p1', categoria_id: 'c3',
    nombre: 'Llave de paso esférica 1/2" (bronce)',
    precio: 320, unidad: 'unidad', stock: 200, activo: true, created_at: '',
    proveedor: { id: 'p1', user_id: 'u1', nombre_empresa: 'Promeria', verificado: true, created_at: '' },
  },
  {
    id: '4', proveedor_id: 'p1', categoria_id: 'c3',
    nombre: 'Pegamento PVC Tangit 237ml',
    precio: 290, unidad: 'frasco', stock: 0, activo: true, created_at: '',
    proveedor: { id: 'p1', user_id: 'u1', nombre_empresa: 'Promeria', verificado: true, created_at: '' },
  },
  // Ferretería López — electricidad y ferretería
  {
    id: '5', proveedor_id: 'p2', categoria_id: 'c2',
    nombre: 'Cable eléctrico THHN 12 AWG (rollo 100m)',
    precio: 3200, unidad: 'rollo', stock: 45, activo: true, created_at: '',
    proveedor: { id: 'p2', user_id: 'u2', nombre_empresa: 'Ferretería López', verificado: true, created_at: '' },
  },
  {
    id: '6', proveedor_id: 'p2', categoria_id: 'c2',
    nombre: 'Breaker Square D 20A 1 polo',
    precio: 580, unidad: 'unidad', stock: 80, activo: true, created_at: '',
    proveedor: { id: 'p2', user_id: 'u2', nombre_empresa: 'Ferretería López', verificado: true, created_at: '' },
  },
  {
    id: '7', proveedor_id: 'p2', categoria_id: 'c4',
    nombre: 'Pintura acrílica interior (cubo 5 galones)',
    precio: 2800, unidad: 'cubo', stock: 25, activo: true, created_at: '',
    proveedor: { id: 'p2', user_id: 'u2', nombre_empresa: 'Ferretería López', verificado: true, created_at: '' },
  },
  // Materiales del Norte — construcción
  {
    id: '8', proveedor_id: 'p3', categoria_id: 'c1',
    nombre: 'Cemento Portland Tipo I (42.5 kg)',
    descripcion: 'Saco de cemento Portland gris, resistencia mínima 42.5 MPa.',
    precio: 850, unidad: 'saco', stock: 500, activo: true, created_at: '',
    proveedor: { id: 'p3', user_id: 'u3', nombre_empresa: 'Materiales del Norte', verificado: true, created_at: '' },
  },
  {
    id: '9', proveedor_id: 'p3', categoria_id: 'c1',
    nombre: 'Varilla de hierro 3/8" x 6m',
    precio: 420, unidad: 'unidad', stock: 300, activo: true, created_at: '',
    proveedor: { id: 'p3', user_id: 'u3', nombre_empresa: 'Materiales del Norte', verificado: true, created_at: '' },
  },
  {
    id: '10', proveedor_id: 'p3', categoria_id: 'c1',
    nombre: 'Bloques de hormigón 6" (pallet x 100)',
    precio: 4800, unidad: 'pallet', stock: 30, activo: true, created_at: '',
    proveedor: { id: 'p3', user_id: 'u3', nombre_empresa: 'Materiales del Norte', verificado: true, created_at: '' },
  },
]

const CATEGORIAS = ['Todos', 'Materiales', 'Electricidad', 'Plomería', 'Ferretería']

export default function CatalogoPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Catálogo de productos</h1>
        <p className="mt-1 text-gray-500">
          {PRODUCTOS_MOCK.length} productos de {new Set(PRODUCTOS_MOCK.map(p => p.proveedor_id)).size} proveedores
        </p>
      </div>

      {/* Search + Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar productos, materiales, marcas..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Categorías */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            className="shrink-0 rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 hover:border-orange-400 hover:text-orange-500 transition-colors first:border-orange-400 first:bg-orange-50 first:text-orange-600"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de productos */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {PRODUCTOS_MOCK.map((producto) => (
          <ProductoCard key={producto.id} producto={producto} />
        ))}
      </div>
    </div>
  )
}
