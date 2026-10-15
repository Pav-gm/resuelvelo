'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Filtros de cotizaciones tal como viajan en la URL. */
export interface FiltrosCotizacionesValores {
  estado?: string
  proveedor?: string
  desde?: string
  hasta?: string
  busqueda?: string
  orden?: string
}

/** Proveedor ofrecido como opción del selector. */
export interface OpcionProveedorFiltro {
  id: string
  nombre: string
}

interface FiltrosCotizacionesProps {
  /** Ruta destino de la navegación (por ejemplo `/mis-cotizaciones`). */
  pathname: string
  /** Valores actuales leídos de la URL. */
  filtros: FiltrosCotizacionesValores
  /** Estados ofrecidos como selector o pestañas. */
  estados: string[]
  /** Opciones del selector de proveedor; omitidas, no se muestra. */
  proveedores?: OpcionProveedorFiltro[]
  /** true: pestañas por estado; false: selector de estado. */
  tabs?: boolean
}

const ORDEN_OPCIONES = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'antiguas', label: 'Más antiguas' },
]

/** Clave de filtro en la URL, en el orden en que se serializa. */
const CLAVES = ['estado', 'proveedor', 'desde', 'hasta', 'busqueda', 'orden'] as const

function etiquetaEstado(estado: string): string {
  return estado.charAt(0).toUpperCase() + estado.slice(1)
}

/**
 * Controles de filtro compartidos por las bandejas de cotizaciones. Cada cambio
 * reescribe la URL conservando los filtros no modificados, omite los vacíos y
 * descarta `pagina` para volver a la primera página.
 */
export default function FiltrosCotizaciones({
  pathname,
  filtros,
  estados,
  proveedores = [],
  tabs = false,
}: FiltrosCotizacionesProps) {
  const router = useRouter()
  // El buscador se comporta como un formulario: solo navega al enviarse.
  const [busqueda, setBusqueda] = useState(filtros.busqueda ?? '')
  const [busquedaPrevia, setBusquedaPrevia] = useState(filtros.busqueda ?? '')
  if ((filtros.busqueda ?? '') !== busquedaPrevia) {
    setBusquedaPrevia(filtros.busqueda ?? '')
    setBusqueda(filtros.busqueda ?? '')
  }

  function navegar(cambios: FiltrosCotizacionesValores) {
    const valores: FiltrosCotizacionesValores = { ...filtros, ...cambios }
    const params = new URLSearchParams()
    for (const clave of CLAVES) {
      const valor = valores[clave]?.trim()
      if (!valor) continue
      if (clave === 'orden' && valor === 'recientes') continue
      params.set(clave, valor)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleBusqueda(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    navegar({ busqueda: busqueda.trim() || undefined })
  }

  return (
    <div className="mb-6 space-y-4">
      {tabs ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => navegar({ estado: undefined })}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              !filtros.estado
                ? 'border-orange-400 bg-orange-50 text-orange-600'
                : 'border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-500'
            )}
          >
            Todas
          </button>
          {estados.map((estado) => (
            <button
              key={estado}
              type="button"
              onClick={() => navegar({ estado })}
              className={cn(
                'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                filtros.estado === estado
                  ? 'border-orange-400 bg-orange-50 text-orange-600'
                  : 'border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-500'
              )}
            >
              {etiquetaEstado(estado)}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1 sm:max-w-xs">
          <label htmlFor="estadoCotizaciones" className="text-xs font-medium text-gray-600">
            Estado
          </label>
          <select
            id="estadoCotizaciones"
            value={filtros.estado ?? ''}
            onChange={(evento) => navegar({ estado: evento.target.value || undefined })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          >
            <option value="">Todos los estados</option>
            {estados.map((estado) => (
              <option key={estado} value={estado}>
                {etiquetaEstado(estado)}
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleBusqueda} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          name="busqueda"
          type="search"
          aria-label="Buscar por número"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por número (#COT-000123)"
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
        />
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-1 flex-col gap-1 sm:min-w-[160px]">
          <label htmlFor="desdeCotizaciones" className="text-xs font-medium text-gray-600">
            Desde
          </label>
          <input
            id="desdeCotizaciones"
            type="date"
            value={filtros.desde ?? ''}
            onChange={(evento) => navegar({ desde: evento.target.value || undefined })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1 sm:min-w-[160px]">
          <label htmlFor="hastaCotizaciones" className="text-xs font-medium text-gray-600">
            Hasta
          </label>
          <input
            id="hastaCotizaciones"
            type="date"
            value={filtros.hasta ?? ''}
            onChange={(evento) => navegar({ hasta: evento.target.value || undefined })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </div>

        {proveedores.length > 0 && (
          <div className="flex flex-1 flex-col gap-1 sm:min-w-[200px]">
            <label htmlFor="proveedorCotizaciones" className="text-xs font-medium text-gray-600">
              Proveedor
            </label>
            <select
              id="proveedorCotizaciones"
              value={filtros.proveedor ?? ''}
              onChange={(evento) => navegar({ proveedor: evento.target.value || undefined })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-1 sm:min-w-[180px]">
          <label htmlFor="ordenCotizaciones" className="text-xs font-medium text-gray-600">
            Ordenar por
          </label>
          <select
            id="ordenCotizaciones"
            value={filtros.orden ?? 'recientes'}
            onChange={(evento) => navegar({ orden: evento.target.value })}
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
    </div>
  )
}
