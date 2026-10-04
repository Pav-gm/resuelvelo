/**
 * Matriz de visibilidad, confirmaciones, errores y línea de seguimiento
 * en la bandeja del proveedor y en Mis cotizaciones.
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import type { ActorVenta, Cotizacion, EstadoCotizacion } from '@/types'

const FECHA_DESPACHO = '2026-04-15T18:30:00.000Z'

const IDS: Record<EstadoCotizacion, string> = {
  pendiente: 'pendient-0000-4000-8000-000000000001',
  respondida: 'respondi-0000-4000-8000-000000000002',
  aceptada: 'aceptada-0000-4000-8000-000000000003',
  rechazada: 'rechazad-0000-4000-8000-000000000004',
  despachada: 'despacha-0000-4000-8000-000000000005',
  recibida: 'recibida-0000-4000-8000-000000000006',
  cancelada: 'cancelad-0000-4000-8000-000000000007',
}

const BADGES: Record<EstadoCotizacion, [string, string]> = {
  pendiente: ['bg-yellow-100', 'text-yellow-700'],
  respondida: ['bg-blue-100', 'text-blue-700'],
  aceptada: ['bg-green-100', 'text-green-700'],
  rechazada: ['bg-red-100', 'text-red-700'],
  despachada: ['bg-indigo-100', 'text-indigo-700'],
  recibida: ['bg-teal-100', 'text-teal-700'],
  cancelada: ['bg-gray-100', 'text-gray-500'],
}

const CONFIRMACIONES = {
  despachar: '¿Marcar esta venta como despachada? El comprador podrá confirmar la recepción.',
  'cancelar-proveedor':
    '¿Cancelar esta venta? Se liberará el stock reservado y la acción no se puede deshacer.',
  'cancelar-comprador':
    '¿Cancelar esta cotización? Se liberará el stock reservado y la acción no se puede deshacer.',
  'confirmar-recepcion':
    '¿Confirmar la recepción de este pedido? Se descontará el stock y la acción no se puede deshacer.',
} as const

const acciones = vi.hoisted(() => ({
  despacharCotizacion: vi.fn(async () => null as { error: string } | null),
  cancelarVenta: vi.fn(async () => null as { error: string } | null),
  cancelarCotizacion: vi.fn(async () => null as { error: string } | null),
  confirmarRecepcion: vi.fn(async () => null as { error: string } | null),
  responderCotizacion: vi.fn(async () => undefined),
  toggleProducto: vi.fn(async () => undefined),
  eliminarProducto: vi.fn(async () => undefined),
  crearProducto: vi.fn(async () => null),
  actualizarProducto: vi.fn(async () => null),
  cotizarDesdeCarrito: vi.fn(async () => null),
}))

const session = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  proveedor: { id: 'prov-1', nombre_empresa: 'Ferretería Central', ciudad: 'Santiago' } as {
    id: string
    nombre_empresa: string
    ciudad: string
  } | null,
  adminRol: 'admin',
  adminCotizaciones: [] as Array<{
    id: string
    estado: string
    total_estimado: number | null
    comprador: null
    proveedor: null
    items: []
  }>,
}))

const quotes = vi.hoisted(() => ({
  proveedor: [] as Cotizacion[],
  comprador: [] as Cotizacion[],
}))

vi.mock('next/link', async () => {
  const React = await import('react')
  return {
    default: ({ href, children }: { href: string; children?: import("react").ReactNode }) =>
      React.createElement('a', { href }, children),
  }
})

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`)
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/app/(marketplace)/proveedor/actions', () => ({
  despacharCotizacion: acciones.despacharCotizacion,
  cancelarVenta: acciones.cancelarVenta,
  toggleProducto: acciones.toggleProducto,
  eliminarProducto: acciones.eliminarProducto,
  crearProducto: acciones.crearProducto,
  actualizarProducto: acciones.actualizarProducto,
}))

vi.mock('@/app/(marketplace)/cotizaciones/actions', () => ({
  cancelarCotizacion: acciones.cancelarCotizacion,
  confirmarRecepcion: acciones.confirmarRecepcion,
  responderCotizacion: acciones.responderCotizacion,
  cotizarDesdeCarrito: acciones.cotizarDesdeCarrito,
}))

vi.mock('@/lib/data', () => ({
  getProveedorDelUsuario: async () => session.proveedor,
  getCotizacionesDeProveedor: async () => quotes.proveedor,
  getCotizacionesDelComprador: async () => quotes.comprador,
  getStatsProveedor: async () => ({ productosActivos: 0, cotizacionesPendientes: 0, sinStock: 0 }),
  getProductosDeProveedor: async () => [],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: session.user } }),
    },
    from(table: string) {
      const payload =
        table === 'profiles'
          ? { data: { rol: session.adminRol }, error: null }
          : table === 'cotizaciones'
            ? { data: session.adminCotizaciones, error: null }
            : { data: [], error: null }
      const builder = {
        select() {
          return builder
        },
        eq() {
          return builder
        },
        order() {
          return builder
        },
        single: async () => payload,
        then(
          onFulfilled?: ((value: typeof payload) => unknown) | null,
          onRejected?: ((reason: unknown) => unknown) | null,
        ) {
          return Promise.resolve(payload).then(onFulfilled, onRejected)
        },
      }
      return builder
    },
  }),
}))

import AccionVentaButton from '@/components/marketplace/AccionVentaButton'
import LineaSeguimiento from '@/components/marketplace/LineaSeguimiento'
import AdminPage from '@/app/(marketplace)/admin/page'
import MisCotizacionesPage from '@/app/(marketplace)/mis-cotizaciones/page'
import PedidosPage from '@/app/(marketplace)/proveedor/pedidos/page'
import PanelProveedorPage from '@/app/(marketplace)/proveedor/page'

type Accion = ComponentProps<typeof AccionVentaButton>['accion']

const BOTONES: Array<{
  accion: Accion
  label: string
  confirmacion: string
  fn: 'despacharCotizacion' | 'cancelarVenta' | 'cancelarCotizacion' | 'confirmarRecepcion'
}> = [
  {
    accion: 'despachar',
    label: 'Marcar como despachada',
    confirmacion: CONFIRMACIONES.despachar,
    fn: 'despacharCotizacion',
  },
  {
    accion: 'cancelar-proveedor',
    label: 'Cancelar venta',
    confirmacion: CONFIRMACIONES['cancelar-proveedor'],
    fn: 'cancelarVenta',
  },
  {
    accion: 'cancelar-comprador',
    label: 'Cancelar',
    confirmacion: CONFIRMACIONES['cancelar-comprador'],
    fn: 'cancelarCotizacion',
  },
  {
    accion: 'confirmar-recepcion',
    label: 'Confirmar recepción',
    confirmacion: CONFIRMACIONES['confirmar-recepcion'],
    fn: 'confirmarRecepcion',
  },
]

const ESTADOS = Object.keys(IDS) as EstadoCotizacion[]

function formatoFecha(valor: string): string {
  return new Date(valor).toLocaleString('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function etiqueta(estado: string): string {
  return estado.charAt(0).toUpperCase() + estado.slice(1)
}

function cotizacion(estado: EstadoCotizacion, extra: Partial<Cotizacion> = {}): Cotizacion {
  return {
    id: IDS[estado],
    comprador_id: 'comprador-1',
    proveedor_id: 'prov-1',
    estado,
    created_at: '2026-03-01T12:00:00.000Z',
    total_estimado: 1500,
    despachada_at: estado === 'despachada' || estado === 'recibida' ? FECHA_DESPACHO : null,
    cancelada_por: estado === 'cancelada' ? 'comprador' : null,
    items: [],
    ...extra,
  }
}

function todas(): Cotizacion[] {
  return ESTADOS.map((estado) => cotizacion(estado))
}

function tarjeta(id: string) {
  const titulo = screen.getByText(`Cotización #${id.slice(0, 8).toUpperCase()}`)
  const card = titulo.closest('div.rounded-2xl')
  if (!card) throw new Error(`Sin tarjeta para ${id}`)
  return card as HTMLElement
}

function badgeDe(scope: HTMLElement, estado: EstadoCotizacion) {
  const badge = within(scope)
    .getAllByText(etiqueta(estado))
    .find((el) => typeof el.className === 'string' && el.className.includes('rounded-full'))
  if (!badge) throw new Error(`Sin badge para ${estado}`)
  return badge
}

let confirmSpy: ReturnType<typeof vi.spyOn> | null = null

function confirmar(valor: boolean) {
  confirmSpy?.mockRestore()
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(valor)
  return confirmSpy
}

beforeEach(() => {
  session.user = { id: 'user-1' }
  session.proveedor = { id: 'prov-1', nombre_empresa: 'Ferretería Central', ciudad: 'Santiago' }
  session.adminRol = 'admin'
  session.adminCotizaciones = []
  quotes.proveedor = []
  quotes.comprador = []
  localStorage.clear()
  for (const fn of Object.values(acciones)) fn.mockReset()
})

afterEach(() => {
  cleanup()
  confirmSpy?.mockRestore()
  confirmSpy = null
})

describe('AccionVentaButton', () => {
  it.each(BOTONES)(
    '$accion pide confirmación y llama solo a $fn',
    async ({ accion, label, confirmacion, fn }) => {
      const confirm = confirmar(true)
      render(<AccionVentaButton cotizacionId={IDS.aceptada} accion={accion} />)

      fireEvent.click(screen.getByRole('button', { name: label }))

      expect(confirm).toHaveBeenCalledWith(confirmacion)
      await waitFor(() => expect(acciones[fn]).toHaveBeenCalledWith(IDS.aceptada))
      for (const otro of BOTONES) {
        if (otro.fn !== fn) expect(acciones[otro.fn]).not.toHaveBeenCalled()
      }
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    },
  )

  it('no ejecuta la acción si se cancela la confirmación', () => {
    confirmar(false)
    render(<AccionVentaButton cotizacionId={IDS.aceptada} accion="despachar" />)

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como despachada' }))

    expect(acciones.despacharCotizacion).not.toHaveBeenCalled()
  })

  it('muestra el error de la acción y no lo presenta como éxito', async () => {
    confirmar(true)
    acciones.despacharCotizacion.mockResolvedValue({
      error: 'Solo puedes despachar una venta aceptada.',
    })
    render(<AccionVentaButton cotizacionId={IDS.aceptada} accion="despachar" />)

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como despachada' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo puedes despachar una venta aceptada.')
    expect(screen.getByRole('button', { name: 'Marcar como despachada' })).toBeEnabled()
  })

  it('limpia el error en un intento posterior que termina bien', async () => {
    confirmar(true)
    acciones.cancelarVenta.mockResolvedValueOnce({ error: 'Esta venta ya no se puede cancelar.' })
    render(<AccionVentaButton cotizacionId={IDS.aceptada} accion="cancelar-proveedor" />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar venta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta venta ya no se puede cancelar.')

    acciones.cancelarVenta.mockResolvedValueOnce(null)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar venta' }))

    await waitFor(() => expect(acciones.cancelarVenta).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('deshabilita el botón mientras la acción está pendiente', async () => {
    confirmar(true)
    let resolver: (value: { error: string } | null) => void = () => {}
    acciones.confirmarRecepcion.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve
        }),
    )
    render(<AccionVentaButton cotizacionId={IDS.despachada} accion="confirmar-recepcion" />)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }))

    expect(await screen.findByRole('button', { name: '...' })).toBeDisabled()
    await act(async () => {
      resolver(null)
    })
    expect(await screen.findByRole('button', { name: 'Confirmar recepción' })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('LineaSeguimiento', () => {
  it.each(['pendiente', 'respondida', 'rechazada'] as const)(
    'no muestra seguimiento en %s',
    (estado) => {
      const { container } = render(<LineaSeguimiento estado={estado} despachadaAt={FECHA_DESPACHO} />)
      expect(container).toBeEmptyDOMElement()
    },
  )

  it('en aceptada marca solo el primer paso y no usa una fecha de despacho ausente del estado', () => {
    render(<LineaSeguimiento estado="aceptada" despachadaAt={FECHA_DESPACHO} />)

    expect(screen.getByRole('list', { name: 'Seguimiento de la cotización' })).toBeInTheDocument()
    expect(screen.getByText('Aceptada')).toHaveClass('text-gray-900')
    expect(screen.getByText('Despachada')).toHaveClass('text-gray-400')
    expect(screen.getByText('Recibida')).toHaveClass('text-gray-400')
    expect(screen.queryByText(formatoFecha(FECHA_DESPACHO))).not.toBeInTheDocument()
    expect(screen.queryByText(/^Cancelada/)).not.toBeInTheDocument()
  })

  it('en despachada muestra la fecha y deja pendiente la recepción', () => {
    render(<LineaSeguimiento estado="despachada" despachadaAt={FECHA_DESPACHO} />)

    const fecha = formatoFecha(FECHA_DESPACHO)
    expect(fecha.toLowerCase()).toContain('abril')
    expect(screen.getByText(fecha)).toBeInTheDocument()
    expect(screen.getByText('Aceptada')).toHaveClass('text-gray-900')
    expect(screen.getByText('Despachada')).toHaveClass('text-gray-900')
    expect(screen.getByText('Recibida')).toHaveClass('text-gray-400')
  })

  it('en despachada sin fecha no inventa el momento del despacho', () => {
    render(<LineaSeguimiento estado="despachada" despachadaAt={null} />)

    expect(screen.getByText('Despachada')).toHaveClass('text-gray-900')
    expect(screen.queryByText(formatoFecha(FECHA_DESPACHO))).not.toBeInTheDocument()
  })

  it('en recibida conserva los tres pasos y la fecha', () => {
    render(<LineaSeguimiento estado="recibida" despachadaAt={FECHA_DESPACHO} />)

    expect(screen.getByText('Aceptada')).toHaveClass('text-gray-900')
    expect(screen.getByText('Despachada')).toHaveClass('text-gray-900')
    expect(screen.getByText('Recibida')).toHaveClass('text-gray-900')
    expect(screen.getByText(formatoFecha(FECHA_DESPACHO))).toBeInTheDocument()
    expect(screen.queryByText(/^Cancelada/)).not.toBeInTheDocument()
  })

  it.each([
    ['comprador', 'Cancelada por el comprador'],
    ['proveedor', 'Cancelada por el proveedor'],
  ] as const)('en cancelada identifica a %s', (actor, texto) => {
    render(<LineaSeguimiento estado="cancelada" canceladaPor={actor} />)

    expect(screen.getByText(texto)).toBeInTheDocument()
    expect(screen.getByText('Aceptada')).toHaveClass('text-gray-900')
    expect(screen.getByText('Despachada')).toHaveClass('text-gray-400')
    expect(screen.getByText('Recibida')).toHaveClass('text-gray-400')
  })

  it('en cancelada no atribuye un valor nulo ni un identificador que no es un rol', () => {
    const { rerender } = render(<LineaSeguimiento estado="cancelada" canceladaPor={null} />)
    expect(screen.getByText('Cancelada')).toBeInTheDocument()

    rerender(
      <LineaSeguimiento
        estado="cancelada"
        canceladaPor={'3f1c9a2e-1111-4111-8111-111111111111' as ActorVenta}
      />,
    )
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
    expect(screen.queryByText(/por el comprador/)).not.toBeInTheDocument()
    expect(screen.queryByText(/por el proveedor/)).not.toBeInTheDocument()
  })

  it('una cancelación con fecha de despacho marca Despachada y no Recibida', () => {
    render(<LineaSeguimiento estado="cancelada" despachadaAt={FECHA_DESPACHO} canceladaPor="proveedor" />)

    expect(screen.getByText('Despachada')).toHaveClass('text-gray-900')
    expect(screen.getByText(formatoFecha(FECHA_DESPACHO))).toBeInTheDocument()
    expect(screen.getByText('Recibida')).toHaveClass('text-gray-400')
    expect(screen.getByText('Cancelada por el proveedor')).toBeInTheDocument()
  })
})

describe('Bandeja del proveedor', () => {
  const proveedorEspera: Record<
    EstadoCotizacion,
    { despachar: boolean; cancelar: boolean; responder: boolean; seguimiento: boolean }
  > = {
    pendiente: { despachar: false, cancelar: false, responder: true, seguimiento: false },
    respondida: { despachar: false, cancelar: false, responder: false, seguimiento: false },
    aceptada: { despachar: true, cancelar: true, responder: false, seguimiento: true },
    rechazada: { despachar: false, cancelar: false, responder: false, seguimiento: false },
    despachada: { despachar: false, cancelar: true, responder: false, seguimiento: true },
    recibida: { despachar: false, cancelar: false, responder: false, seguimiento: true },
    cancelada: { despachar: false, cancelar: false, responder: false, seguimiento: true },
  }

  async function montar() {
    quotes.proveedor = todas()
    render(await PedidosPage())
  }

  it('muestra badges, acciones y seguimiento según el estado', async () => {
    await montar()

    expect(screen.queryByRole('button', { name: 'Confirmar recepción' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Cancelar$/ })).not.toBeInTheDocument()
    expect(screen.queryByText('El proveedor aceptó; falta que despache.')).not.toBeInTheDocument()

    for (const estado of ESTADOS) {
      const card = tarjeta(IDS[estado])
      const espera = proveedorEspera[estado]
      expect(badgeDe(card, estado)).toHaveClass(...BADGES[estado])

      const despachar = within(card).queryByRole('button', { name: 'Marcar como despachada' })
      const cancelar = within(card).queryByRole('button', { name: 'Cancelar venta' })
      const aceptar = within(card).queryByRole('button', { name: 'Aceptar' })
      const rechazar = within(card).queryByRole('button', { name: 'Rechazar' })

      expect(Boolean(despachar)).toBe(espera.despachar)
      expect(Boolean(cancelar)).toBe(espera.cancelar)
      expect(Boolean(aceptar)).toBe(espera.responder)
      expect(Boolean(rechazar)).toBe(espera.responder)
      expect(Boolean(within(card).queryByText('Seguimiento'))).toBe(espera.seguimiento)
    }

    expect(within(tarjeta(IDS.despachada)).getByText(formatoFecha(FECHA_DESPACHO))).toBeInTheDocument()
    expect(within(tarjeta(IDS.recibida)).getByText(formatoFecha(FECHA_DESPACHO))).toBeInTheDocument()
    expect(within(tarjeta(IDS.cancelada)).getByText('Cancelada por el comprador')).toBeInTheDocument()
  })

  it('aceptar y rechazar conservan su acción, sin confirmación de venta', async () => {
    await montar()
    const confirm = confirmar(true)
    const card = tarjeta(IDS.pendiente)

    fireEvent.click(within(card).getByRole('button', { name: 'Aceptar' }))
    await waitFor(() => expect(acciones.responderCotizacion).toHaveBeenCalledWith(IDS.pendiente, 'aceptada'))

    fireEvent.click(within(card).getByRole('button', { name: 'Rechazar' }))
    await waitFor(() => expect(acciones.responderCotizacion).toHaveBeenCalledWith(IDS.pendiente, 'rechazada'))

    expect(confirm).not.toHaveBeenCalled()
    expect(acciones.despacharCotizacion).not.toHaveBeenCalled()
    expect(acciones.cancelarVenta).not.toHaveBeenCalled()
  })

  it('despacho y cancelación piden confirmación y usan la acción del proveedor', async () => {
    await montar()
    const confirm = confirmar(true)

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como despachada' }))
    expect(confirm).toHaveBeenCalledWith(CONFIRMACIONES.despachar)
    await waitFor(() => expect(acciones.despacharCotizacion).toHaveBeenCalledWith(IDS.aceptada))

    fireEvent.click(within(tarjeta(IDS.aceptada)).getByRole('button', { name: 'Cancelar venta' }))
    expect(confirm).toHaveBeenCalledWith(CONFIRMACIONES['cancelar-proveedor'])
    await waitFor(() => expect(acciones.cancelarVenta).toHaveBeenCalledWith(IDS.aceptada))

    fireEvent.click(within(tarjeta(IDS.despachada)).getByRole('button', { name: 'Cancelar venta' }))
    await waitFor(() => expect(acciones.cancelarVenta).toHaveBeenCalledWith(IDS.despachada))

    expect(acciones.cancelarCotizacion).not.toHaveBeenCalled()
    expect(acciones.confirmarRecepcion).not.toHaveBeenCalled()
  })

  it('cancelar la confirmación no despacha', async () => {
    await montar()
    confirmar(false)

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como despachada' }))

    expect(acciones.despacharCotizacion).not.toHaveBeenCalled()
  })

  it('un error de despacho se muestra y la tarjeta sigue en aceptada', async () => {
    await montar()
    confirmar(true)
    acciones.despacharCotizacion.mockResolvedValue({ error: 'Solo puedes despachar una venta aceptada.' })

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como despachada' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo puedes despachar una venta aceptada.')
    const card = tarjeta(IDS.aceptada)
    expect(badgeDe(card, 'aceptada')).toHaveClass(...BADGES.aceptada)
    expect(within(card).getByText('Despachada')).toHaveClass('text-gray-400')
  })

  it('un despacho exitoso no adelanta el estado en la tarjeta', async () => {
    await montar()
    confirmar(true)
    acciones.despacharCotizacion.mockResolvedValue(null)

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como despachada' }))
    await waitFor(() => expect(acciones.despacharCotizacion).toHaveBeenCalled())

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(within(tarjeta(IDS.aceptada)).getByText('Despachada')).toHaveClass('text-gray-400')
  })

  it('sin sesión redirige a login', async () => {
    session.user = null
    await expect(PedidosPage()).rejects.toThrow('REDIRECT /login')
  })

  it('sin proveedor redirige al registro', async () => {
    session.proveedor = null
    await expect(PedidosPage()).rejects.toThrow('REDIRECT /register?rol=proveedor')
  })
})

describe('Mis cotizaciones', () => {
  const compradorEspera: Record<
    EstadoCotizacion,
    { cancelar: boolean; recibir: boolean; espera: boolean; seguimiento: boolean }
  > = {
    pendiente: { cancelar: false, recibir: false, espera: false, seguimiento: false },
    respondida: { cancelar: false, recibir: false, espera: false, seguimiento: false },
    aceptada: { cancelar: true, recibir: false, espera: true, seguimiento: true },
    rechazada: { cancelar: false, recibir: false, espera: false, seguimiento: false },
    despachada: { cancelar: false, recibir: true, espera: false, seguimiento: true },
    recibida: { cancelar: false, recibir: false, espera: false, seguimiento: true },
    cancelada: { cancelar: false, recibir: false, espera: false, seguimiento: true },
  }

  async function montar(params: { enviada?: string; parcial?: string } = {}) {
    quotes.comprador = todas()
    render(await MisCotizacionesPage({ searchParams: Promise.resolve(params) }))
  }

  it('muestra el texto de espera, badges y acciones del comprador', async () => {
    await montar()

    expect(screen.queryByRole('button', { name: 'Marcar como despachada' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar venta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument()

    for (const estado of ESTADOS) {
      const card = tarjeta(IDS[estado])
      const espera = compradorEspera[estado]
      expect(badgeDe(card, estado)).toHaveClass(...BADGES[estado])
      expect(Boolean(within(card).queryByRole('button', { name: /^Cancelar$/ }))).toBe(espera.cancelar)
      expect(Boolean(within(card).queryByRole('button', { name: 'Confirmar recepción' }))).toBe(espera.recibir)
      expect(Boolean(within(card).queryByText('El proveedor aceptó; falta que despache.'))).toBe(espera.espera)
      expect(Boolean(within(card).queryByText('Seguimiento'))).toBe(espera.seguimiento)
    }

    expect(within(tarjeta(IDS.despachada)).getByText(formatoFecha(FECHA_DESPACHO))).toBeInTheDocument()
    expect(within(tarjeta(IDS.recibida)).getByText(formatoFecha(FECHA_DESPACHO))).toBeInTheDocument()
    expect(within(tarjeta(IDS.cancelada)).getByText('Cancelada por el comprador')).toBeInTheDocument()
  })

  it('cancelar y confirmar recepción usan la acción del comprador tras confirmar', async () => {
    await montar()
    const confirm = confirmar(true)

    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/ }))
    expect(confirm).toHaveBeenCalledWith(CONFIRMACIONES['cancelar-comprador'])
    await waitFor(() => expect(acciones.cancelarCotizacion).toHaveBeenCalledWith(IDS.aceptada))

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }))
    expect(confirm).toHaveBeenCalledWith(CONFIRMACIONES['confirmar-recepcion'])
    await waitFor(() => expect(acciones.confirmarRecepcion).toHaveBeenCalledWith(IDS.despachada))

    expect(acciones.despacharCotizacion).not.toHaveBeenCalled()
    expect(acciones.cancelarVenta).not.toHaveBeenCalled()
  })

  it('cancelar la confirmación no confirma la recepción', async () => {
    await montar()
    confirmar(false)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }))

    expect(acciones.confirmarRecepcion).not.toHaveBeenCalled()
  })

  it('un error de recepción se muestra y la tarjeta sigue despachada', async () => {
    await montar()
    confirmar(true)
    acciones.confirmarRecepcion.mockResolvedValue({
      error: 'Solo puedes marcar como recibido un pedido despachado.',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Solo puedes marcar como recibido un pedido despachado.',
    )
    const card = tarjeta(IDS.despachada)
    expect(badgeDe(card, 'despachada')).toHaveClass(...BADGES.despachada)
    expect(within(card).getByText('Recibida')).toHaveClass('text-gray-400')
    expect(within(card).queryByRole('button', { name: /^Cancelar$/ })).not.toBeInTheDocument()
  })

  it('conserva el aviso de cotización enviada', async () => {
    quotes.comprador = []
    render(await MisCotizacionesPage({ searchParams: Promise.resolve({ enviada: '1', parcial: '1' }) }))

    expect(screen.getByText(/Cotización enviada con éxito/)).toBeInTheDocument()
    expect(screen.getByText(/no se incluyeron en la cotización/)).toBeInTheDocument()
  })

  it('sin sesión redirige a login', async () => {
    session.user = null
    await expect(MisCotizacionesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('REDIRECT /login')
  })
})

describe('Badges del panel y de administración', () => {
  it('el panel muestra los badges nuevos y los previos', async () => {
    quotes.proveedor = [
      cotizacion('recibida'),
      cotizacion('cancelada'),
      cotizacion('despachada'),
      cotizacion('pendiente'),
      cotizacion('respondida'),
    ]
    const primera = render(await PanelProveedorPage())

    for (const estado of ['recibida', 'cancelada', 'despachada', 'pendiente', 'respondida'] as const) {
      expect(badgeDe(primera.container, estado)).toHaveClass(...BADGES[estado])
    }
    expect(screen.queryByRole('button', { name: 'Marcar como despachada' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar venta' })).not.toBeInTheDocument()

    primera.unmount()
    quotes.proveedor = [cotizacion('aceptada'), cotizacion('rechazada')]
    render(await PanelProveedorPage())

    expect(badgeDe(document.body, 'aceptada')).toHaveClass(...BADGES.aceptada)
    expect(badgeDe(document.body, 'rechazada')).toHaveClass(...BADGES.rechazada)
  })

  it('Pedidos este mes sigue contando solo aceptada', async () => {
    quotes.proveedor = [
      cotizacion('despachada'),
      cotizacion('recibida'),
      cotizacion('cancelada'),
      cotizacion('pendiente'),
      cotizacion('respondida'),
      cotizacion('aceptada', { id: 'aceptaa1-0000-4000-8000-000000000011' }),
      cotizacion('aceptada', { id: 'aceptaa2-0000-4000-8000-000000000012' }),
    ]
    render(await PanelProveedorPage())

    const valor = screen.getByText('Pedidos este mes').previousElementSibling
    if (!valor) throw new Error('Sin valor de Pedidos este mes')
    expect(valor).toHaveTextContent('2')
    expect(screen.queryByText('Aceptada')).not.toBeInTheDocument()
  })

  it('administración muestra el badge de cada estado', async () => {
    session.adminCotizaciones = ESTADOS.map((estado) => ({
      id: IDS[estado],
      estado,
      total_estimado: 10,
      comprador: null,
      proveedor: null,
      items: [],
    }))
    render(await AdminPage())

    for (const estado of ESTADOS) {
      expect(badgeDe(document.body, estado)).toHaveClass(...BADGES[estado])
    }
  })
})
