/**
 * Comparador de solicitudes multiproveedor: proveedores y sus importes,
 * resaltado del total más bajo y del plazo más corto, línea no disponible y
 * listado «Mis solicitudes» con estado derivado y enlace al comparador.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { SolicitudComparador } from '@/types'

const h = vi.hoisted(() => ({
  state: { user: null as { id: string } | null },
  redirect: vi.fn(),
  getSolicitudesDelComprador: vi.fn(),
  getCotizacionesDelComprador: vi.fn(),
  aceptarOfertaDeSolicitud: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    h.redirect(url)
    throw new Error('NEXT_REDIRECT')
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

vi.mock('@/lib/data', () => ({
  getSolicitudesDelComprador: h.getSolicitudesDelComprador,
  getCotizacionesDelComprador: h.getCotizacionesDelComprador,
}))

vi.mock('@/app/(marketplace)/cotizaciones/actions', () => ({
  aceptarOfertaDeSolicitud: h.aceptarOfertaDeSolicitud,
}))

import ComparadorSolicitud from '@/components/marketplace/ComparadorSolicitud'
import SolicitudesPage from '@/app/(marketplace)/solicitudes/page'

const solicitud = {
  id: 'sol-1',
  comprador_id: 'buyer-1',
  titulo: 'Materiales obra',
  notas: null,
  fecha_requerida: null,
  created_at: '2026-10-01T12:00:00.000Z',
}

function itemCemento(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    cotizacion_id: 'cot-1',
    producto_id: null,
    descripcion: 'Cemento',
    unidad: 'sacos',
    cantidad: 2,
    cantidad_ofertada: 2,
    precio_ofertado: 50,
    producto: { nombre: 'Cemento' },
    sujeta_disponibilidad: false,
    stock_al_cotizar: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  h.state.user = { id: 'buyer-1' }
  h.aceptarOfertaDeSolicitud.mockResolvedValue(null)
  h.getSolicitudesDelComprador.mockResolvedValue([])
  h.getCotizacionesDelComprador.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
})

describe('Comparador de solicitud multiproveedor', () => {
  it('el comparador muestra dos proveedores y marca el total más bajo y el plazo más corto', () => {
    const data = {
      solicitud,
      cotizaciones: [
        {
          id: 'cot-a',
          numero: 1,
          comprador_id: 'buyer-1',
          proveedor_id: 'prov-a',
          estado: 'respondida',
          created_at: '2026-10-02T12:00:00.000Z',
          plazo_dias: 5,
          valida_hasta: '2999-01-01',
          condiciones: null,
          proveedor: {
            id: 'prov-a',
            nombre_empresa: 'Proveedor A',
            verificado: true,
            promedio_feedback: 4.5,
            conteo_feedback: 2,
          },
          items: [itemCemento({ cotizacion_id: 'cot-a', precio_ofertado: 50 })],
        },
        {
          id: 'cot-b',
          numero: 2,
          comprador_id: 'buyer-1',
          proveedor_id: 'prov-b',
          estado: 'respondida',
          created_at: '2026-10-03T12:00:00.000Z',
          plazo_dias: 8,
          valida_hasta: '2999-01-01',
          condiciones: null,
          proveedor: {
            id: 'prov-b',
            nombre_empresa: 'Proveedor B',
            verificado: false,
            promedio_feedback: 0,
            conteo_feedback: 0,
          },
          items: [itemCemento({ cotizacion_id: 'cot-b', precio_ofertado: 40 })],
        },
      ],
    } as unknown as SolicitudComparador

    render(<ComparadorSolicitud data={data} />)

    expect(screen.getByText('Proveedor A')).toBeInTheDocument()
    expect(screen.getByText('Proveedor B')).toBeInTheDocument()
    expect(screen.getByText('RD$ 50.00 c/u')).toBeInTheDocument()
    expect(screen.getByText('RD$ 40.00 c/u')).toBeInTheDocument()
    expect(screen.getAllByText('RD$ 100.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RD$ 80.00').length).toBeGreaterThan(0)

    const columnaA = screen.getByRole('columnheader', { name: /Proveedor A/ })
    const columnaB = screen.getByRole('columnheader', { name: /Proveedor B/ })

    expect(within(columnaB).getByText('Total más bajo')).toBeInTheDocument()
    expect(within(columnaA).getByText('Plazo más corto')).toBeInTheDocument()
    expect(within(columnaA).queryByText('Total más bajo')).toBeNull()
    expect(within(columnaB).queryByText('Plazo más corto')).toBeNull()
  })

  it('el comparador identifica una línea sin precio como no disponible', () => {
    const data = {
      solicitud,
      cotizaciones: [
        {
          id: 'cot-1',
          numero: 1,
          comprador_id: 'buyer-1',
          proveedor_id: 'prov-a',
          estado: 'respondida',
          created_at: '2026-10-02T12:00:00.000Z',
          plazo_dias: 5,
          valida_hasta: '2999-01-01',
          condiciones: null,
          proveedor: {
            id: 'prov-a',
            nombre_empresa: 'Proveedor A',
            verificado: true,
            promedio_feedback: 4.5,
            conteo_feedback: 2,
          },
          items: [itemCemento({ precio_ofertado: null, cantidad_ofertada: 0 })],
        },
      ],
    } as unknown as SolicitudComparador

    render(<ComparadorSolicitud data={data} />)

    expect(screen.getByText('No disponible')).toBeInTheDocument()
    expect(screen.getByText('RD$ 0.00')).toBeInTheDocument()
  })

  it('mis solicitudes muestra su estado y enlaza al comparador', async () => {
    h.getSolicitudesDelComprador.mockResolvedValue([solicitud])
    h.getCotizacionesDelComprador.mockResolvedValue([
      {
        id: 'cot-1',
        solicitud_id: 'sol-1',
        estado: 'respondida',
        created_at: '2026-10-02T12:00:00.000Z',
      },
    ])

    render(await SolicitudesPage())

    expect(screen.getByText('Materiales obra')).toBeInTheDocument()
    expect(screen.getByText('Respondida')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Materiales obra/ })).toHaveAttribute(
      'href',
      '/solicitudes/sol-1'
    )
  })
})
