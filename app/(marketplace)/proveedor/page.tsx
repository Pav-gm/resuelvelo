import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Package, ShoppingBag, TrendingUp, AlertCircle,
  Plus, ArrowRight, CheckCircle2, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import {
  getProveedorDelUsuario,
  getStatsProveedor,
  getCotizacionesDeProveedor,
  getProductosDeProveedor,
} from '@/lib/data'
import ToggleProductoButton from '@/components/marketplace/ToggleProductoButton'
import EliminarProductoButton from '@/components/marketplace/EliminarProductoButton'

const estadoBadge: Record<string, string> = {
  pendiente:  'bg-yellow-100 text-yellow-700',
  respondida: 'bg-blue-100 text-blue-700',
  aceptada:   'bg-green-100 text-green-700',
  rechazada:  'bg-red-100 text-red-700',
}

const estadoIcono: Record<string, React.ElementType> = {
  pendiente:  Clock,
  respondida: ArrowRight,
  aceptada:   CheckCircle2,
  rechazada:  AlertCircle,
}

export default async function PanelProveedorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const proveedor = await getProveedorDelUsuario()
  if (!proveedor) redirect('/register?rol=proveedor')

  const [stats, cotizaciones, productos] = await Promise.all([
    getStatsProveedor(proveedor.id),
    getCotizacionesDeProveedor(proveedor.id),
    getProductosDeProveedor(proveedor.id),
  ])

  const statsCards = [
    { label: 'Productos activos',   valor: stats.productosActivos,        icono: Package,      color: 'text-blue-600 bg-blue-50' },
    { label: 'Cotizaciones nuevas', valor: stats.cotizacionesPendientes,  icono: ShoppingBag,  color: 'text-orange-600 bg-orange-50' },
    { label: 'Pedidos este mes',    valor: cotizaciones.filter(c => c.estado === 'aceptada').length, icono: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Sin stock',           valor: stats.sinStock,                icono: AlertCircle,  color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de proveedor</h1>
          <p className="mt-1 text-gray-500">
            Bienvenido, <span className="font-medium text-gray-700">{proveedor.nombre_empresa}</span>
            {proveedor.ciudad && <span className="text-xs text-gray-400"> ({proveedor.ciudad})</span>}
          </p>
        </div>
        <Link href="/proveedor/productos/nuevo">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo producto
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        {statsCards.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm border">
            <div className={`inline-flex items-center justify-center rounded-xl p-2.5 ${s.color}`}>
              <s.icono className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{s.valor}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cotizaciones recientes */}
      <div className="rounded-2xl bg-white border shadow-sm mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Cotizaciones recientes</h2>
          <Link href="/proveedor/pedidos">
            <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600">
              Ver todas
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="divide-y">
          {cotizaciones.slice(0, 5).map((cot) => {
            const Icono = estadoIcono[cot.estado] ?? Clock
            const cantItems = cot.items?.length ?? 0
            return (
              <div key={cot.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${estadoBadge[cot.estado]}`}>
                  <Icono className="h-3 w-3" />
                  {cot.estado.charAt(0).toUpperCase() + cot.estado.slice(1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">Cotización #{cot.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">
                    {cantItems} producto{cantItems !== 1 ? 's' : ''} · {new Date(cot.created_at).toLocaleDateString('es-DO')}
                  </p>
                </div>
                <Link href={`/proveedor/pedidos`}>
                  <Button variant="outline" size="sm">Ver</Button>
                </Link>
              </div>
            )
          })}
          {cotizaciones.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-gray-400">Aún no hay cotizaciones.</p>
          )}
        </div>
      </div>

      {/* Mis productos */}
      <div className="rounded-2xl bg-white border shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Mis productos</h2>
        </div>
        <div className="divide-y">
          {productos.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{p.nombre}</p>
                <p className="text-xs text-gray-400">
                  ${p.precio.toLocaleString('es-DO', { minimumFractionDigits: 2 })} / {p.unidad} · Stock: {p.stock}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {p.activo ? 'Activo' : 'Inactivo'}
              </span>
              <ToggleProductoButton id={p.id} activo={p.activo} />
              <Link href={`/proveedor/productos/${p.id}/editar`}>
                <Button variant="outline" size="sm">Editar</Button>
              </Link>
              <EliminarProductoButton id={p.id} nombre={p.nombre} />
            </div>
          ))}
          {productos.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              Aún no publicaste productos.{' '}
              <Link href="/proveedor/productos/nuevo" className="text-orange-500 hover:underline">Publicar ahora</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
