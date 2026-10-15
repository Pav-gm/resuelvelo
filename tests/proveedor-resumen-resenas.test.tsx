/**
 * Resumen del panel del proveedor (ocho métricas y cotizaciones recientes) y
 * página de reseñas (fecha/hora dominicana, respuesta guardada y formulario).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { Producto } from '@/types'

const h = vi.hoisted(() => ({
  state: { user: null as { id: string } | null },
  redirect: vi.fn(),
  getProveedorDelUsuario: vi.fn(),
  getStatsProveedor: vi.fn(),
  getCotizacionesDeProveedor: vi.fn(),
  getProductosDeProveedor: vi.fn(),
  getFeedbackDeProveedor: vi.fn(),
  responderFeedbackProveedor: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    h.redirect(url)
    throw new Error('NEXT_REDIRECT')
  },
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.state.user } }) },
  }),
}))

vi.mock('@/lib/data', () => ({
  getProveedorDelUsuario: h.getProveedorDelUsuario,
  getStatsProveedor: h.getStatsProveedor,
  getCotizacionesDeProveedor: h.getCotizacionesDeProveedor,
  getProductosDeProveedor: h.getProductosDeProveedor,
  getFeedbackDeProveedor: h.getFeedbackDeProveedor,
}))

vi.mock('@/app/(marketplace)/proveedor/actions', () => ({
  responderFeedbackProveedor: h.responderFeedbackProveedor,
  solicitarVerificacionProveedor: vi.fn(),
  toggleProducto: vi.fn(),
  eliminarProducto: vi.fn(),
  archivarOEliminarProducto: vi.fn(),
  restaurarProducto: vi.fn(),
}))

import PanelProveedorPage from '@/app/(marketplace)/proveedor/page'
import ResenasProveedorPage from '@/app/(marketplace)/proveedor/resenas/page'

function cotizacion(id: string, estado: string) {
  return {
    id,
    numero: 1,
    comprador_id: 'buyer-1',
    proveedor_id: 'prov-1',
    estado,
    created_at: '2026-10-01T12:00:00.000Z',
    items: [],
  }
}

function producto(overrides: Partial<Producto>): Producto {
  return {
    id: 'p',
    proveedor_id: 'prov-1',
    categoria_id: 'cat-1',
    subcategoria_id: null,
    nombre: 'Producto',
    precio: 10,
    unidad: 'unidad',
    stock: 1,
    activo: true,
    created_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  h.state.user = { id: 'prov-user-1' }
  h.getProveedorDelUsuario.mockResolvedValue({
    id: 'prov-1',
    nombre_empresa: 'Promeria',
    verificado: true,
  })
  h.getStatsProveedor.mockResolvedValue({
    productosActivos: 0,
    cotizacionesPendientes: 0,
    sinStock: 0,
    pedidosEsteMes: 0,
    totalVendidoEsteMes: 0,
  })
  h.getCotizacionesDeProveedor.mockResolvedValue([])
  h.getProductosDeProveedor.mockResolvedValue([])
  h.getFeedbackDeProveedor.mockResolvedValue({ promedio: 0, conteo: 0, reseñas: [] })
})

afterEach(() => {
  cleanup()
})

describe('Resumen y reseñas del proveedor', () => {
  it('muestra las ocho métricas del resumen con datos simulados', async () => {
    h.getStatsProveedor.mockResolvedValue({
      productosActivos: 4,
      cotizacionesPendientes: 2,
      sinStock: 0,
      pedidosEsteMes: 7,
      totalVendidoEsteMes: 12345.67,
    })
    h.getCotizacionesDeProveedor.mockResolvedValue([
      cotizacion('cot-a1', 'aceptada'),
      cotizacion('cot-a2', 'aceptada'),
      cotizacion('cot-p1', 'pendiente'),
      cotizacion('cot-p2', 'pendiente'),
      cotizacion('cot-p3', 'pendiente'),
    ])
    h.getProductosDeProveedor.mockResolvedValue([
      producto({ id: 'p1' }),
      producto({ id: 'p2' }),
      producto({ id: 'p3' }),
      producto({ id: 'p4' }),
      producto({ id: 'p5', activo: false, archivado_at: '2026-10-01T12:00:00.000Z' }),
      producto({ id: 'p6', activo: false, archivado_at: '2026-10-01T12:00:00.000Z' }),
    ])
    h.getFeedbackDeProveedor.mockResolvedValue({ promedio: 4.5, conteo: 2, reseñas: [] })

    render(await PanelProveedorPage())

    const metricas: Array<[string, string]> = [
      ['stat-pedidos-mes', '7'],
      ['stat-total-vendido', 'RD$ 12,345.67'],
      ['stat-cotizaciones-pendientes', '2'],
      ['stat-pedidos-por-despachar', '2'],
      ['stat-productos-activos', '4'],
      ['stat-productos-archivados', '2'],
      ['stat-calificacion', '4.50'],
      ['stat-resenas', '2'],
    ]
    for (const [testid, valor] of metricas) {
      expect(within(screen.getByTestId(testid)).getByText(valor)).toBeInTheDocument()
    }
    expect(screen.getAllByTestId('quote-row')).toHaveLength(5)
  })

  it('muestra reseña y respuesta en hora de Santo Domingo', async () => {
    h.getFeedbackDeProveedor.mockResolvedValue({
      promedio: 5,
      conteo: 1,
      reseñas: [
        {
          id: 'fb-1',
          proveedor_id: 'prov-1',
          calificacion: 5,
          comentario: 'Entrega a tiempo',
          created_at: '2026-10-08T02:20:00.000Z',
          autor_anonimo: 'Comprador verificado',
          respuesta: 'Gracias por tu comentario.',
        },
      ],
    })

    render(await ResenasProveedorPage())

    expect(screen.getByText('5 de 5 estrellas')).toBeInTheDocument()
    expect(screen.getByText('Entrega a tiempo')).toBeInTheDocument()
    expect(screen.getByText('Comprador verificado')).toBeInTheDocument()
    expect(screen.getByText('7 de octubre de 2026, 10:20 p. m.')).toBeInTheDocument()
    expect(screen.getByText('Tu respuesta')).toBeInTheDocument()
    expect(screen.getByText('Gracias por tu comentario.')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Responder reseña' })).toBeNull()
  })

  it('permite responder una reseña sin respuesta', async () => {
    h.getFeedbackDeProveedor.mockResolvedValue({
      promedio: 4,
      conteo: 1,
      reseñas: [
        {
          id: 'fb-2',
          proveedor_id: 'prov-1',
          calificacion: 4,
          comentario: null,
          created_at: '2026-10-08T02:20:00.000Z',
          autor_anonimo: 'Comprador verificado',
          respuesta: null,
        },
      ],
    })
    h.responderFeedbackProveedor.mockResolvedValue({ success: true })

    render(await ResenasProveedorPage())

    expect(screen.getByRole('form', { name: 'Responder reseña' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Respuesta'), {
      target: { value: 'Gracias por tu reseña.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar respuesta' }))

    await waitFor(() =>
      expect(h.responderFeedbackProveedor).toHaveBeenCalledWith('fb-2', 'Gracias por tu reseña.')
    )
    expect(await screen.findByText('Respuesta publicada.')).toBeInTheDocument()
  })
})
