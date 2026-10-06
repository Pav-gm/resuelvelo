import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCategorias, getSubcategorias } from '@/lib/data'
import AdminProductoSubcategoria from '@/components/marketplace/AdminProductoSubcategoria'
import ToggleActivoButton from './ToggleActivoButton'

const estadoBadge: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  respondida: 'bg-blue-100 text-blue-700',
  aceptada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
}

type Rel<T> = T | T[] | null | undefined

function relValue<T extends Record<string, unknown>>(
  rel: Rel<T>,
  key: keyof T
): string {
  if (!rel) return '—'
  const row = Array.isArray(rel) ? rel[0] : rel
  const value = row?.[key]
  return typeof value === 'string' && value.length > 0 ? value : '—'
}

function formatoMoneda(valor: number | string | null | undefined): string {
  if (valor == null || valor === '') return '—'
  const n = typeof valor === 'number' ? valor : Number(valor)
  if (Number.isNaN(n)) return '—'
  return `$${n.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'admin') redirect('/catalogo')

  const [proveedoresRes, productosRes, cotizacionesRes, categorias, subcategorias] = await Promise.all([
    supabase
      .from('proveedores')
      .select('id, nombre_empresa, ciudad, verificado')
      .order('nombre_empresa', { ascending: true }),
    supabase
      .from('productos')
      .select('id, nombre, precio, stock, activo, categoria_id, subcategoria_id, proveedor:proveedores(nombre_empresa)')
      .order('nombre', { ascending: true }),
    supabase
      .from('cotizaciones')
      .select(`
        id,
        estado,
        total_estimado,
        comprador:profiles!comprador_id(nombre),
        proveedor:proveedores(nombre_empresa),
        items:items_cotizacion(
          id,
          cantidad,
          producto:productos(nombre)
        )
      `)
      .order('created_at', { ascending: false }),
    getCategorias(),
    getSubcategorias(),
  ])

  const proveedores = proveedoresRes.data ?? []
  const productos = productosRes.data ?? []
  const cotizaciones = cotizacionesRes.data ?? []
  const categoriaPorId = new Map(categorias.map((cat) => [cat.id, cat.nombre]))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
        <p className="mt-1 text-gray-500">
          Revisa proveedores, productos y cotizaciones de la plataforma.
        </p>
      </div>

      <div className="rounded-2xl bg-white border shadow-sm mb-8">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Proveedores</h2>
        </div>
        <div className="divide-y">
          {proveedores.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{p.nombre_empresa}</p>
                <p className="text-xs text-gray-400">{p.ciudad || 'Sin ciudad'}</p>
              </div>
              <span className="text-sm text-gray-600">
                Verificado: {p.verificado ? 'sí' : 'no'}
              </span>
            </div>
          ))}
          {proveedores.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              Aún no hay proveedores.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white border shadow-sm mb-8">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Productos</h2>
        </div>
        <div className="divide-y">
          {productos.map((p) => {
            const proveedorNombre = relValue(
              p.proveedor as Rel<{ nombre_empresa: string }>,
              'nombre_empresa'
            )
            return (
              <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{p.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {proveedorNombre} · {categoriaPorId.get(p.categoria_id) ?? 'Sin categoría'} · {formatoMoneda(p.precio)} · Stock: {p.stock}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {p.activo ? 'Activo' : 'Inactivo'}
                </span>
                <AdminProductoSubcategoria
                  productoId={p.id}
                  categoriaId={p.categoria_id}
                  subcategoriaId={p.subcategoria_id}
                  subcategorias={subcategorias}
                />
                <ToggleActivoButton id={p.id} activo={p.activo} />
              </div>
            )
          })}
          {productos.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              Aún no hay productos.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white border shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Cotizaciones</h2>
        </div>
        <div className="divide-y">
          {cotizaciones.map((cot) => {
            const items = cot.items ?? []
            const compradorNombre = relValue(
              cot.comprador as Rel<{ nombre: string }>,
              'nombre'
            )
            const proveedorNombre = relValue(
              cot.proveedor as Rel<{ nombre_empresa: string }>,
              'nombre_empresa'
            )
            return (
              <div key={cot.id} className="px-6 py-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      estadoBadge[cot.estado] ?? 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {cot.estado.charAt(0).toUpperCase() + cot.estado.slice(1)}
                  </span>
                  <p className="font-medium text-gray-900">
                    {formatoMoneda(cot.total_estimado)}
                  </p>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Comprador: <span className="font-medium text-gray-800">{compradorNombre}</span>
                  {' · '}
                  Proveedor: <span className="font-medium text-gray-800">{proveedorNombre}</span>
                </p>
                {items.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-gray-500">
                    {items.map((item) => (
                      <li key={item.id}>
                        {relValue(item.producto as Rel<{ nombre: string }>, 'nombre')}
                        {' · '}
                        cantidad {item.cantidad}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-gray-400">Sin ítems.</p>
                )}
              </div>
            )
          })}
          {cotizaciones.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              Aún no hay cotizaciones.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
