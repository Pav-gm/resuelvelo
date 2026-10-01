import type { EstadoCotizacion } from '@/types'

export const ESTADO_LABEL: Record<EstadoCotizacion, string> = {
  pendiente: 'Pendiente',
  respondida: 'Respondida',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  despachada: 'Despachada',
  recibida: 'Recibida',
  cancelada: 'Cancelada',
}

export const ESTADO_BADGE: Record<EstadoCotizacion, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  respondida: 'bg-blue-100 text-blue-700',
  aceptada: 'bg-amber-100 text-amber-800',
  rechazada: 'bg-red-100 text-red-700',
  despachada: 'bg-blue-100 text-blue-700',
  recibida: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-600',
}

export const ESTADOS_VENTA: EstadoCotizacion[] = [
  'aceptada',
  'despachada',
  'recibida',
  'cancelada',
]
