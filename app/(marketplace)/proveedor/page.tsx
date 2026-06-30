import Link from 'next/link'
import {
  Package, ShoppingBag, TrendingUp, AlertCircle,
  Plus, ArrowRight, CheckCircle2, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const stats = [
  { label: 'Productos activos', valor: '24', icono: Package, color: 'text-blue-600 bg-blue-50' },
  { label: 'Cotizaciones nuevas', valor: '7', icono: ShoppingBag, color: 'text-orange-600 bg-orange-50' },
  { label: 'Pedidos este mes', valor: '13', icono: TrendingUp, color: 'text-green-600 bg-green-50' },
  { label: 'Sin stock', valor: '3', icono: AlertCircle, color: 'text-red-600 bg-red-50' },
]

const cotizacionesRecientes = [
  { id: 'cot-001', comprador: 'Construcciones Herrera', productos: 3, estado: 'pendiente', fecha: 'Hoy, 2:30 PM' },
  { id: 'cot-002', comprador: 'Ferreshop RD', productos: 1, estado: 'respondida', fecha: 'Ayer, 10:15 AM' },
  { id: 'cot-003', comprador: 'Obra Civil SRL', productos: 5, estado: 'aceptada', fecha: '04 jun, 9:00 AM' },
]

const estadoBadge = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  respondida: 'bg-blue-100 text-blue-700',
  aceptada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
}

const estadoIcono = {
  pendiente: Clock,
  respondida: ArrowRight,
  aceptada: CheckCircle2,
  rechazada: AlertCircle,
}

export default function PanelProveedorPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de proveedor</h1>
          <p className="mt-1 text-gray-500">Bienvenido, <span className="font-medium text-gray-700">Promeria</span> <span className="text-xs text-gray-400">(Plomería)</span></p>
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
        {stats.map((s) => (
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
      <div className="rounded-2xl bg-white border shadow-sm">
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
          {cotizacionesRecientes.map((cot) => {
            const Icono = estadoIcono[cot.estado as keyof typeof estadoIcono]
            return (
              <div key={cot.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${estadoBadge[cot.estado as keyof typeof estadoBadge]}`}>
                  <Icono className="h-3 w-3" />
                  {cot.estado.charAt(0).toUpperCase() + cot.estado.slice(1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{cot.comprador}</p>
                  <p className="text-xs text-gray-400">{cot.productos} producto{cot.productos > 1 ? 's' : ''} · {cot.fecha}</p>
                </div>
                <Button variant="outline" size="sm">Ver</Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
