/**
 * Página de detalle compartida de una cotización: contenido por rol, matriz de
 * acciones según estado, manejo de sesión/detalle denegado, enlaces desde las
 * listas y legibilidad móvil (envoltura sin scroll horizontal).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { formatNumeroCotizacion } from '@/lib/cotizaciones'
import CotizacionDetallePage from '@/app/(marketplace)/cotizaciones/[id]/page'
import PanelProveedorPage from '@/app/(marketplace)/proveedor/page'
import PedidosPage from '@/app/(marketplace)/proveedor/pedidos/page'
import MisCotizacionesPage from '@/app/(marketplace)/mis-cotizaciones/page'

const h = vi.hoisted(() => ({
  state: { user: null as { id: string } | null },
  redirect: vi.fn(),
  notFound: vi.fn(),
  getCotizacionDetalle: vi.fn(),
  getFeedbackPorCotizacion: vi.fn(),
  getProveedorDelUsuario: vi.fn(),
  getStatsProveedor: vi.fn(),
  getCotizacionesDeProveedor: vi.fn(),
  getProductosDeProveedor: vi.fn(),
  getCotizacionesDelComprador: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    h.redirect(url)
    throw new Error('NEXT_REDIRECT')
  },
  notFound: () => {
    h.notFound()
    throw new Error('NEXT_NOT_FOUND')
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children?: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.state.user } }) },
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getCotizacionDetalle: h.getCotizacionDetalle,
  getFeedbackPorCotizacion: h.getFeedbackPorCotizacion,
  getProveedorDelUsuario: h.getProveedorDelUsuario,
  getStatsProveedor: h.getStatsProveedor,
  getCotizacionesDeProveedor: h.getCotizacionesDeProveedor,
  getProductosDeProveedor: h.getProductosDeProveedor,
  getCotizacionesDelComprador: h.getCotizacionesDelComprador,
}))

const detalleBase = {
  comprador_id: 'buyer-1',
  proveedor_id: 'prov-1',
  mensaje: null,
  total_estimado: null,
  created_at: '2026-03-15T15:00:00.000Z',
  despachada_at: null,
  cancelada_por: null,
  proveedor: { id: 'prov-1', nombre_empresa: 'Promeria', ciudad: 'Santo Domingo', verificado: true },
  comprador: { id: 'buyer-1', nombre: 'Ana', email: 'ana@example.com', telefono: '809-555-0101' },
  items: [] as unknown[],
}

beforeEach(() => {
  vi.clearAllMocks()
  h.state.user = { id: 'buyer-1' }
  h.getCotizacionDetalle.mockResolvedValue(null)
  h.getFeedbackPorCotizacion.mockResolvedValue(null)
  h.getProveedorDelUsuario.mockResolvedValue(null)
  h.getStatsProveedor.mockResolvedValue({ productosActivos: 0, cotizacionesPendientes: 0, sinStock: 0 })
  h.getCotizacionesDeProveedor.mockResolvedValue([])
  h.getProductosDeProveedor.mockResolvedValue([])
  h.getCotizacionesDelComprador.mockResolvedValue([])
})

describe('Página de detalle de cotización', () => {
  it('el comprador ve cantidades y total confirmados en el detalle despachado', async () => {
    h.state.user = { id: 'buyer-1' }
    h.getCotizacionDetalle.mockResolvedValue({
      ...detalleBase,
      id: 'cot-1',
      numero: 42,
      estado: 'despachada',
      mensaje: 'Entregar por la entrada norte',
      total_estimado: 30,
      despachada_at: '2026-03-16T15:00:00.000Z',
      items: [
        {
          id: 'item-1',
          cotizacion_id: 'cot-1',
          producto_id: 'prod-1',
          cantidad: 3,
          cantidad_confirmada: 1,
          precio_unitario: 10,
          sujeta_disponibilidad: false,
          stock_al_cotizar: 5,
          producto: { id: 'prod-1', nombre: 'Tubo PVC', activo: true },
        },
      ],
    })

    render(await CotizacionDetallePage({ params: Promise.resolve({ id: 'cot-1' }) }))

    expect(screen.getByText(`Cotización #${formatNumeroCotizacion(42)}`)).toBeInTheDocument()
    expect(screen.getByText('Promeria')).toBeInTheDocument()
    expect(screen.getByText('Santo Domingo')).toBeInTheDocument()
    expect(screen.getByText('Proveedor verificado')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText('809-555-0101')).toBeInTheDocument()
    expect(screen.getByText('Entregar por la entrada norte')).toBeInTheDocument()

    const enlaceProducto = screen.getByRole('link', { name: 'Tubo PVC' })
    expect(enlaceProducto).toHaveAttribute('href', '/productos/prod-1')

    expect(screen.getByText('1 de 3 confirmadas')).toBeInTheDocument()
    expect(screen.getByText('Pedido: 3')).toBeInTheDocument()
    expect(screen.getByText('x1')).toBeInTheDocument()
    expect(screen.getByText('$10.00 c/u')).toBeInTheDocument()
    expect(screen.getByText('$10.00')).toBeInTheDocument()
    expect(screen.getByText('Total confirmado: $10.00')).toBeInTheDocument()
    expect(screen.queryByText('x3')).toBeNull()
    expect(screen.queryByText(/Total estimado/)).toBeNull()

    expect(screen.getByRole('region', { name: 'Seguimiento de la cotización' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar recepción' })).toBeInTheDocument()

    expect(screen.queryByText('Aceptar')).toBeNull()
    expect(screen.queryByText('Rechazar')).toBeNull()
    expect(screen.queryByText('Marcar como despachada')).toBeNull()
    expect(screen.queryByText('Cancelar venta')).toBeNull()
  })

  it('la bandeja del proveedor muestra la cantidad y el total confirmados', async () => {
    h.state.user = { id: 'provider-user-1' }
    h.getProveedorDelUsuario.mockResolvedValue({
      id: 'prov-1',
      user_id: 'provider-user-1',
      nombre_empresa: 'Promeria',
      verificado: true,
      created_at: '2026-01-01T00:00:00.000Z',
    })
    h.getCotizacionesDeProveedor.mockResolvedValue([
      {
        id: 'cot-1',
        numero: 42,
        comprador_id: 'buyer-1',
        proveedor_id: 'prov-1',
        estado: 'despachada',
        created_at: '2026-03-15T15:00:00.000Z',
        despachada_at: '2026-03-16T15:00:00.000Z',
        cancelada_por: null,
        items: [
          {
            id: 'item-1',
            cotizacion_id: 'cot-1',
            producto_id: 'prod-1',
            cantidad: 3,
            cantidad_confirmada: 1,
            precio_unitario: 10,
            sujeta_disponibilidad: false,
            stock_al_cotizar: 5,
            producto: { id: 'prod-1', nombre: 'Tubo PVC', activo: true },
          },
        ],
      },
    ])

    render(await PedidosPage())

    expect(screen.getByText('Tubo PVC')).toBeInTheDocument()
    expect(screen.getByText('1 de 3 confirmadas')).toBeInTheDocument()
    expect(screen.getByText('Pedido: 3')).toBeInTheDocument()
    expect(screen.getByText('x1')).toBeInTheDocument()
    expect(screen.getByText('$10.00')).toBeInTheDocument()
    expect(screen.getByText('Total confirmado: $10.00')).toBeInTheDocument()
  })

  it('el nombre de un producto activo enlaza a su ficha', async () => {
    h.state.user = { id: 'buyer-1' }
    h.getCotizacionDetalle.mockResolvedValue({
      ...detalleBase,
      id: 'cot-1',
      numero: 42,
      estado: 'pendiente',
      items: [
        {
          id: 'item-1',
          cotizacion_id: 'cot-1',
          producto_id: 'prod-1',
          cantidad: 2,
          precio_unitario: 10,
          sujeta_disponibilidad: false,
          stock_al_cotizar: 5,
          producto: { id: 'prod-1', nombre: 'Tubo PVC', activo: true },
        },
      ],
    })

    render(await CotizacionDetallePage({ params: Promise.resolve({ id: 'cot-1' }) }))

    expect(screen.getByRole('link', { name: 'Tubo PVC' })).toHaveAttribute(
      'href',
      '/productos/prod-1'
    )
  })

  it('el nombre de un producto inactivo se muestra sin enlace', async () => {
    h.state.user = { id: 'buyer-1' }
    h.getCotizacionDetalle.mockResolvedValue({
      ...detalleBase,
      id: 'cot-1',
      numero: 42,
      estado: 'pendiente',
      items: [
        {
          id: 'item-1',
          cotizacion_id: 'cot-1',
          producto_id: 'prod-1',
          cantidad: 2,
          precio_unitario: 10,
          sujeta_disponibilidad: false,
          stock_al_cotizar: 5,
          producto: { id: 'prod-1', nombre: 'Tubo PVC', activo: false },
        },
      ],
    })

    render(await CotizacionDetallePage({ params: Promise.resolve({ id: 'cot-1' }) }))

    expect(screen.getByText('Tubo PVC')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Tubo PVC' })).toBeNull()
  })

  it('el proveedor ve los controles de pendiente y no las acciones del comprador', async () => {
    h.state.user = { id: 'provider-user-1' }
    h.getCotizacionDetalle.mockResolvedValue({
      ...detalleBase,
      id: 'cot-2',
      numero: 43,
      estado: 'pendiente',
      proveedor: { id: 'prov-1', nombre_empresa: 'Promeria', ciudad: null, verificado: false },
      comprador: { id: 'buyer-1', nombre: 'Ana', email: 'ana@example.com', telefono: null },
      items: [],
    })

    render(await CotizacionDetallePage({ params: Promise.resolve({ id: 'cot-2' }) }))

    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument()
    expect(screen.queryByText('809-555-0101')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Confirmar recepción' })).toBeNull()
    expect(screen.queryByText('Cancelar')).toBeNull()
    expect(screen.queryByLabelText('Dejar reseña del proveedor')).toBeNull()
  })

  it('el usuario sin sesión es redirigido a login', async () => {
    h.state.user = null

    await expect(
      CotizacionDetallePage({ params: Promise.resolve({ id: 'cot-1' }) })
    ).rejects.toThrow('NEXT_REDIRECT')

    expect(h.redirect).toHaveBeenCalledWith('/login')
    expect(h.getCotizacionDetalle).not.toHaveBeenCalled()
  })

  it('el usuario sin acceso a la cotización recibe 404', async () => {
    h.state.user = { id: 'intruso-1' }
    h.getCotizacionDetalle.mockResolvedValue(null)

    await expect(
      CotizacionDetallePage({ params: Promise.resolve({ id: 'cot-privada' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(h.notFound).toHaveBeenCalled()
  })

  it('los enlaces de comprador y proveedor abren el detalle de cada cotización', async () => {
    const cotizacion = {
      id: 'cot-1',
      numero: 42,
      comprador_id: 'buyer-1',
      proveedor_id: 'prov-1',
      estado: 'pendiente',
      created_at: '2026-03-15T15:00:00.000Z',
      despachada_at: null,
      cancelada_por: null,
      items: [],
    }

    h.state.user = { id: 'provider-user-1' }
    h.getProveedorDelUsuario.mockResolvedValue({
      id: 'prov-1',
      user_id: 'provider-user-1',
      nombre_empresa: 'Promeria',
      verificado: true,
      created_at: '2026-01-01T00:00:00.000Z',
    })
    h.getCotizacionesDeProveedor.mockResolvedValue([cotizacion])

    render(await PanelProveedorPage())
    const filaPanel = screen.getByTestId('quote-row')
    const verPanel = within(filaPanel).getByRole('link', { name: 'Ver' })
    expect(verPanel).toHaveAttribute('href', '/cotizaciones/cot-1')
    expect(verPanel).not.toHaveAttribute('href', '/proveedor/pedidos')
    cleanup()

    render(await PedidosPage())
    expect(screen.getByRole('link', { name: 'Ver' })).toHaveAttribute('href', '/cotizaciones/cot-1')
    cleanup()

    h.state.user = { id: 'buyer-1' }
    h.getCotizacionesDelComprador.mockResolvedValue([cotizacion])
    render(await MisCotizacionesPage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByRole('link', { name: 'Ver detalle' })).toHaveAttribute(
      'href',
      '/cotizaciones/cot-1'
    )
  })

  it('la página de detalle usa filas y contenido que pueden envolver en móvil', async () => {
    const nombreLargo = 'A'.repeat(100)
    h.state.user = { id: 'buyer-1' }
    h.getCotizacionDetalle.mockResolvedValue({
      ...detalleBase,
      id: 'cot-1',
      numero: 42,
      estado: 'pendiente',
      items: [
        {
          id: 'item-1',
          cotizacion_id: 'cot-1',
          producto_id: 'prod-1',
          cantidad: 1,
          precio_unitario: 5,
          sujeta_disponibilidad: false,
          stock_al_cotizar: 5,
          producto: { id: 'prod-1', nombre: nombreLargo },
        },
      ],
    })

    const { container } = render(
      await CotizacionDetallePage({ params: Promise.resolve({ id: 'cot-1' }) })
    )

    const contenedorNombre = screen.getByTestId('detalle-item-nombre')
    expect(contenedorNombre.className).toContain('min-w-0')
    expect(
      contenedorNombre.className.includes('break-words') ||
        contenedorNombre.className.includes('[overflow-wrap:anywhere]')
    ).toBe(true)

    expect(screen.getByTestId('detalle-header').className).toContain('flex-wrap')
    expect(screen.getByTestId('detalle-item-row').className).toContain('flex-wrap')

    const infractores = Array.from(container.querySelectorAll<HTMLElement>('*')).filter((el) => {
      if (typeof el.className !== 'string') return false
      return el.className
        .split(/\s+/)
        .some((clase) => clase.startsWith('min-w-') && clase !== 'min-w-0')
    })
    expect(infractores).toHaveLength(0)
  })
})
