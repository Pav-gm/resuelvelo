import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProveedorDelUsuario, getCotizacionesDeProveedor } from '@/lib/data'
import { formatNumeroCotizacion } from '@/lib/cotizaciones'
import { formatearPrecio, formatearFecha } from '@/lib/utils'
import type { Cotizacion } from '@/types'
import { Button } from '@/components/ui/button'
import ResponderCotizacionButton from '@/components/marketplace/ResponderCotizacionButton'
import LineaSeguimiento from '@/components/marketplace/LineaSeguimiento'
import AccionesVentaProveedor from '@/components/marketplace/AccionesVentaProveedor'
import FiltrosCotizaciones from '@/components/marketplace/FiltrosCotizaciones'
import type { FiltrosCotizacionesValores } from '@/components/marketplace/FiltrosCotizaciones'

const estadoBadge: Record<string, string> = {
  pendiente:  'bg-yellow-100 text-yellow-700',
  respondida: 'bg-blue-100 text-blue-700',
  aceptada:   'bg-green-100 text-green-700',
  rechazada:  'bg-red-100 text-red-700',
  despachada: 'bg-purple-100 text-purple-700',
  recibida:   'bg-teal-100 text-teal-700',
  cancelada:  'bg-gray-200 text-gray-600',
}

// Desde «aceptada» en adelante rige la cantidad confirmada; antes de aceptar
// solo existe la cantidad pedida.
const ESTADOS_CONFIRMADOS = ['aceptada', 'despachada', 'recibida', 'cancelada']

/** Estados aceptados por el filtro de la URL. */
const ESTADOS_VALIDOS = [
  'pendiente',
  'respondida',
  'aceptada',
  'rechazada',
  'despachada',
  'recibida',
  'cancelada',
]

/** Cotizaciones por página en la bandeja del proveedor. */
const PAGE_SIZE = 20

/** Día calendario (YYYY-MM-DD) en Santo Domingo de un instante ISO. */
function fechaISOEnSantoDomingo(instante: string): string {
  return new Date(instante).toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' })
}

/** Normaliza el texto de búsqueda al número visible: sin `#`, en mayúsculas. */
function normalizarNumeroBusqueda(texto: string): string {
  return texto.trim().replace(/^#/, '').toUpperCase()
}

/** Aplica estado, rango de fechas y número visible. */
function filtrarCotizaciones(
  cotizaciones: Cotizacion[],
  filtros: FiltrosCotizacionesValores
): Cotizacion[] {
  let resultado = cotizaciones
  if (filtros.estado && ESTADOS_VALIDOS.includes(filtros.estado)) {
    resultado = resultado.filter((cot) => cot.estado === filtros.estado)
  }
  if (filtros.desde) {
    const desde = filtros.desde
    resultado = resultado.filter((cot) => fechaISOEnSantoDomingo(cot.created_at) >= desde)
  }
  if (filtros.hasta) {
    const hasta = filtros.hasta
    resultado = resultado.filter((cot) => fechaISOEnSantoDomingo(cot.created_at) <= hasta)
  }
  const busqueda = filtros.busqueda ? normalizarNumeroBusqueda(filtros.busqueda) : ''
  if (busqueda) {
    resultado = resultado.filter((cot) =>
      formatNumeroCotizacion(cot.numero).toUpperCase().includes(busqueda)
    )
  }
  return resultado
}

/** Orden por fecha de creación: descendente por defecto, ascendente con `antiguas`. */
function ordenarCotizaciones(cotizaciones: Cotizacion[], orden?: string): Cotizacion[] {
  const ascendente = orden === 'antiguas'
  return cotizaciones.slice().sort((a, b) => {
    const diferencia = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return ascendente ? diferencia : -diferencia
  })
}

/** Página válida y sus 20 resultados; las páginas fuera de rango se ajustan. */
function paginar(lista: Cotizacion[], paginaParam?: string): {
  pagina: number
  totalPaginas: number
  visibles: Cotizacion[]
} {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / PAGE_SIZE))
  const solicitada = Number.parseInt(paginaParam ?? '', 10)
  const pagina =
    !Number.isInteger(solicitada) || solicitada < 1 ? 1 : Math.min(solicitada, totalPaginas)
  const inicio = (pagina - 1) * PAGE_SIZE
  return { pagina, totalPaginas, visibles: lista.slice(inicio, inicio + PAGE_SIZE) }
}

/** Query de los enlaces de paginación, conservando los filtros actuales. */
function queryConPagina(filtros: FiltrosCotizacionesValores, pagina: number): string {
  const params = new URLSearchParams()
  if (filtros.estado) params.set('estado', filtros.estado)
  if (filtros.desde) params.set('desde', filtros.desde)
  if (filtros.hasta) params.set('hasta', filtros.hasta)
  if (filtros.busqueda) params.set('busqueda', filtros.busqueda)
  if (filtros.orden) params.set('orden', filtros.orden)
  params.set('pagina', String(pagina))
  return params.toString()
}

/** Fecha de validez (YYYY-MM-DD) como dd/mm/aaaa, sin desfase de zona horaria. */
function fechaValidez(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

/** Fecha de un instante como día calendario en Santo Domingo (d/m/aaaa). */
function fechaEnSantoDomingo(instante: string): string {
  return new Date(instante).toLocaleDateString('es-DO', {
    timeZone: 'America/Santo_Domingo',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

/** Texto del rechazo: autor, fecha local en Santo Domingo y motivo. */
function textoRechazo(cot: {
  rechazada_at?: string | null
  created_at: string
  motivo_rechazo?: string | null
  rechazada_motivo?: string | null
}): string {
  const fecha = fechaEnSantoDomingo(cot.rechazada_at ?? cot.created_at)
  const motivoComprador = cot.rechazada_motivo?.trim()
  if (motivoComprador) {
    return `Rechazada por el comprador el ${fecha}: ${motivoComprador}`
  }
  const motivo = cot.motivo_rechazo?.trim() || 'Motivo no especificado.'
  return `Rechazada por el proveedor el ${fecha}: ${motivo}`
}

/** Tarjeta de una cotización con su contenido y acciones de venta existentes. */
function TarjetaCotizacion({ cot }: { cot: Cotizacion }) {
  const items = cot.items ?? []
  const confirmado = ESTADOS_CONFIRMADOS.includes(cot.estado)
  const respondida = cot.estado === 'respondida'
  const tieneOferta = respondida && cot.total_ofertado != null
  const total = items.reduce((sum, i) => {
    const unidades = confirmado ? (i.cantidad_confirmada ?? i.cantidad) : i.cantidad
    return sum + (i.precio_unitario ?? 0) * unidades
  }, 0)

  return (
    <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
      <div data-testid="order-header" className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b">
        <div>
          <p className="font-semibold text-gray-900">
            Cotización #{formatNumeroCotizacion(cot.numero)}
          </p>
          <p className="text-xs text-gray-400">
            {formatearFecha(cot.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${estadoBadge[cot.estado]}`}>
            {cot.estado.charAt(0).toUpperCase() + cot.estado.slice(1)}
          </span>
          <Link href={`/cotizaciones/${cot.id}`}>
            <Button variant="outline" size="sm">Ver</Button>
          </Link>
        </div>
        {/* El diálogo de oferta ocupa el ancho de la tarjeta: su sección usa
            toda la fila en vez de quedar confinada a la columna de acciones. */}
        {cot.estado === 'pendiente' && (
          <div className="basis-full">
            <ResponderCotizacionButton cotizacionId={cot.id} items={items} />
          </div>
        )}
      </div>

      <div className="divide-y">
        {items.map((item) => {
          // Nunca se muestra el id interno: si falta el nombre del producto se
          // usa la descripción libre de la línea.
          const nombreProducto = item.producto?.nombre?.trim()
          const descripcion = item.descripcion?.trim()
          const rotulo = nombreProducto || descripcion || 'Línea sin descripción'
          const unidad = item.unidad?.trim() || item.producto?.unidad?.trim()
          // Con oferta manda el precio/cantidad ofertados; desde aceptada en
          // adelante, lo confirmado; antes, lo pedido.
          const ofertada = respondida && item.precio_ofertado != null
          const unidades = ofertada
            ? (item.cantidad_ofertada ?? item.cantidad)
            : confirmado
              ? (item.cantidad_confirmada ?? item.cantidad)
              : item.cantidad
          const precioUnitario = ofertada ? item.precio_ofertado : item.precio_unitario
          return (
            <div key={item.id} data-testid="order-item-row" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 text-sm sm:flex-nowrap sm:px-6">
              <div className="min-w-0 flex-1">
                <span className="min-w-0 break-words [overflow-wrap:anywhere] text-gray-700">
                  {rotulo}
                </span>
                {confirmado && (
                  <p className="text-xs text-green-700">
                    {`${unidades} de ${item.cantidad} confirmadas`}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {unidad ? `Pedido: ${item.cantidad} ${unidad}` : `Pedido: ${item.cantidad}`}
                </p>
                {item.sujeta_disponibilidad && item.stock_al_cotizar !== null && (
                  <p className="text-xs text-yellow-700">
                    {`Sujeta a disponibilidad: pediste ${item.cantidad}, hay ${item.stock_al_cotizar}`}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-500">
                {ofertada && item.precio_ofertado != null ? (
                  <>
                    {item.precio_unitario != null && (
                      <span>{`Catálogo: ${formatearPrecio(item.precio_unitario)} c/u`}</span>
                    )}
                    <span>{`Oferta: ${formatearPrecio(item.precio_ofertado)} c/u`}</span>
                    <span>x{unidades}</span>
                    <span className="font-medium text-gray-700">
                      {formatearPrecio(item.precio_ofertado * unidades)}
                    </span>
                  </>
                ) : (
                  <>
                    <span>x{unidades}</span>
                    {precioUnitario != null && (
                      <>
                        <span>{`${formatearPrecio(precioUnitario)} c/u`}</span>
                        <span className="font-medium text-gray-700">
                          {formatearPrecio(precioUnitario * unidades)}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {tieneOferta && (
        <div className="border-t bg-blue-50 px-4 py-3 sm:px-6">
          <p className="text-sm font-medium text-gray-900">Oferta registrada</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
            <span>{`plazo ${cot.plazo_dias ?? 0} días`}</span>
            <span>{`válida hasta ${fechaValidez(cot.valida_hasta ?? '')}`}</span>
          </div>
          {cot.condiciones && (
            <p className="mt-1 break-words [overflow-wrap:anywhere] text-sm text-gray-700">
              {cot.condiciones}
            </p>
          )}
        </div>
      )}

      {confirmado
        ? total > 0 && (
            <div className="flex justify-end px-4 py-3 border-t text-sm font-semibold text-gray-900 sm:px-6">
              {`Total confirmado: ${formatearPrecio(total)}`}
            </div>
          )
        : tieneOferta
          ? (
              <div className="flex justify-end px-4 py-3 border-t text-sm font-semibold text-gray-900 sm:px-6">
                {`Total ofertado: ${formatearPrecio(Number(cot.total_ofertado))}`}
              </div>
            )
          : total > 0 && (
              <div className="flex justify-end px-4 py-3 border-t text-sm font-semibold text-gray-900 sm:px-6">
                {`Total estimado: ${formatearPrecio(total)}`}
              </div>
            )}

      {cot.estado === 'rechazada' && (
        <div className="border-t bg-red-50 px-4 py-3 sm:px-6">
          <p className="break-words [overflow-wrap:anywhere] text-sm text-red-700">
            {textoRechazo(cot)}
          </p>
        </div>
      )}

      <LineaSeguimiento
        estado={cot.estado}
        despachadaAt={cot.despachada_at}
        canceladaPor={cot.cancelada_por}
        canceladaAt={cot.cancelada_at}
        canceladaMotivo={cot.cancelada_motivo}
      />

      {/* Despacho y cancelación en aceptada; solo cancelación en despachada. */}
      {(cot.estado === 'aceptada' || cot.estado === 'despachada') && (
        <AccionesVentaProveedor cotizacionId={cot.id} estado={cot.estado} />
      )}
    </div>
  )
}

interface ParamsPedidos {
  estado?: string
  desde?: string
  hasta?: string
  busqueda?: string
  orden?: string
  pagina?: string
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams?: Promise<ParamsPedidos>
} = {}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const proveedor = await getProveedorDelUsuario()
  if (!proveedor) redirect('/register?rol=proveedor')

  const cotizaciones = await getCotizacionesDeProveedor(proveedor.id)
  const params: ParamsPedidos = searchParams ? await searchParams : {}

  const filtros: FiltrosCotizacionesValores = {
    estado: params.estado,
    desde: params.desde,
    hasta: params.hasta,
    busqueda: params.busqueda,
    orden: params.orden,
  }

  // El resumen se calcula sobre todas las cotizaciones, antes de filtrar.
  const resumen = {
    pendientes: cotizaciones.filter((cot) => cot.estado === 'pendiente').length,
    respondidas: cotizaciones.filter((cot) => cot.estado === 'respondida').length,
    aceptadas: cotizaciones.filter((cot) => cot.estado === 'aceptada').length,
    enCurso: cotizaciones.filter((cot) => cot.estado === 'despachada').length,
  }

  const filtradas = filtrarCotizaciones(cotizaciones, filtros)
  const ordenadas = ordenarCotizaciones(filtradas, filtros.orden)
  const { pagina, totalPaginas, visibles } = paginar(ordenadas, params.pagina)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Bandeja de cotizaciones</h1>

      {cotizaciones.length === 0 ? (
        <div className="rounded-2xl bg-white border px-4 py-12 text-center text-gray-400 sm:px-6">
          <p className="text-lg font-medium">Sin cotizaciones</p>
          <p className="mt-1 text-sm">Las solicitudes de los compradores aparecerán aquí.</p>
        </div>
      ) : (
        <>
          <div
            data-testid="resumen-cotizaciones"
            className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <span className="rounded-xl border bg-white px-4 py-3 text-sm font-medium text-gray-700">
              {`Pendientes ${resumen.pendientes}`}
            </span>
            <span className="rounded-xl border bg-white px-4 py-3 text-sm font-medium text-gray-700">
              {`Respondidas ${resumen.respondidas}`}
            </span>
            <span className="rounded-xl border bg-white px-4 py-3 text-sm font-medium text-gray-700">
              {`Aceptadas ${resumen.aceptadas}`}
            </span>
            <span className="rounded-xl border bg-white px-4 py-3 text-sm font-medium text-gray-700">
              {`En curso ${resumen.enCurso}`}
            </span>
          </div>

          <FiltrosCotizaciones
            pathname="/proveedor/pedidos"
            filtros={filtros}
            estados={ESTADOS_VALIDOS}
            tabs
          />

          {visibles.length === 0 ? (
            <div className="rounded-2xl bg-white border px-4 py-8 text-center text-sm text-gray-400 sm:px-6">
              Sin cotizaciones que coincidan con los filtros.
            </div>
          ) : (
            <div className="space-y-4">
              {visibles.map((cot) => <TarjetaCotizacion key={cot.id} cot={cot} />)}
            </div>
          )}

          {totalPaginas > 1 && (
            <div className="mt-6 flex items-center justify-between gap-3">
              {pagina > 1 ? (
                <Link
                  href={`/proveedor/pedidos?${queryConPagina(filtros, pagina - 1)}`}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Anteriores
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-gray-500">{`Página ${pagina} de ${totalPaginas}`}</span>
              {pagina < totalPaginas ? (
                <Link
                  href={`/proveedor/pedidos?${queryConPagina(filtros, pagina + 1)}`}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Siguientes
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
