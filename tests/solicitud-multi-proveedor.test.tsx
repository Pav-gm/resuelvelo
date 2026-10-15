/**
 * Comparador de solicitudes multiproveedor: proveedores y sus importes,
 * resaltado del total más bajo y del plazo más corto, línea no disponible y
 * listado «Mis solicitudes» con estado derivado y enlace al comparador.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { SolicitudComparador } from '@/types'

const h = vi.hoisted(() => ({
  state: { user: null as { id: string } | null },
  redirect: vi.fn(),
  refresh: vi.fn(),
  getSolicitudesDelComprador: vi.fn(),
  getCotizacionesDelComprador: vi.fn(),
  getSolicitudComparador: vi.fn(),
  aceptarOfertaDeSolicitud: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    h.redirect(url)
    throw new Error('NEXT_REDIRECT')
  },
  useRouter: () => ({ refresh: h.refresh }),
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
  getSolicitudComparador: h.getSolicitudComparador,
}))

vi.mock('@/app/(marketplace)/cotizaciones/actions', () => ({
  aceptarOfertaDeSolicitud: h.aceptarOfertaDeSolicitud,
}))

import ComparadorSolicitud from '@/components/marketplace/ComparadorSolicitud'
import SolicitudesPage from '@/app/(marketplace)/solicitudes/page'
import SolicitudComparadorPage from '@/app/(marketplace)/solicitudes/[id]/page'

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
  h.getSolicitudComparador.mockResolvedValue(null)
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
          items: [itemCemento({ cotizacion_id: 'cot-a', precio_ofertado: 100 })],
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
    expect(screen.getByText('RD$ 100.00 c/u')).toBeInTheDocument()
    expect(screen.getByText('RD$ 40.00 c/u')).toBeInTheDocument()
    expect(screen.getAllByText('RD$ 200.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RD$ 80.00').length).toBeGreaterThan(0)

    const columnaA = screen.getByRole('columnheader', { name: /Proveedor A/ })
    const columnaB = screen.getByRole('columnheader', { name: /Proveedor B/ })

    expect(within(columnaB).getByText('Total más bajo')).toBeInTheDocument()
    expect(within(columnaA).getByText('Plazo más corto')).toBeInTheDocument()
    expect(within(columnaA).queryByText('Total más bajo')).toBeNull()
    expect(within(columnaB).queryByText('Plazo más corto')).toBeNull()
  })

  it('el comparador muestra Sin oferta una sola vez y no muestra importes cero cuando no hay líneas ofertadas', () => {
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

    expect(screen.getAllByText('Sin oferta')).toHaveLength(1)
    expect(screen.queryByText('No disponible')).toBeNull()
    expect(screen.queryByText('RD$ 0.00')).toBeNull()
  })

  it('una columna Sin oferta no ofrece aceptar la oferta', () => {
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

    expect(screen.queryByRole('button', { name: 'Aceptar esta oferta' })).toBeNull()
  })

  it('el comparador pide confirmación con proveedor y total antes de aceptar', async () => {
    const data = {
      solicitud,
      cotizaciones: [
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

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar esta oferta' }))

    const textoConfirmacion =
      '¿Aceptar la oferta de Proveedor B por RD$ 80.00? Las demás ofertas de esta solicitud se cerrarán.'
    expect(screen.getByText(textoConfirmacion)).toBeInTheDocument()
    expect(h.aceptarOfertaDeSolicitud).not.toHaveBeenCalled()

    // Volver cierra el diálogo sin aceptar.
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.queryByText(textoConfirmacion)).toBeNull()
    expect(h.aceptarOfertaDeSolicitud).not.toHaveBeenCalled()

    // Confirmar acepta una única vez la oferta elegida.
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar esta oferta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aceptación' }))
    await waitFor(() => expect(h.aceptarOfertaDeSolicitud).toHaveBeenCalledWith('cot-b'))
    expect(h.aceptarOfertaDeSolicitud).toHaveBeenCalledTimes(1)
  })

  it('la columna de la oferta cerrada muestra el motivo de elección', () => {
    const data = {
      solicitud,
      cotizaciones: [
        {
          id: 'cot-a',
          numero: 1,
          comprador_id: 'buyer-1',
          proveedor_id: 'prov-a',
          estado: 'aceptada',
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
          items: [itemCemento({ cotizacion_id: 'cot-a', precio_ofertado: 100 })],
        },
        {
          id: 'cot-b',
          numero: 2,
          comprador_id: 'buyer-1',
          proveedor_id: 'prov-b',
          estado: 'rechazada',
          rechazada_motivo: 'Se eligió otra oferta',
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
          items: [itemCemento({ cotizacion_id: 'cot-b', precio_ofertado: null, cantidad_ofertada: 0 })],
        },
      ],
    } as unknown as SolicitudComparador

    render(<ComparadorSolicitud data={data} />)

    const columnaCerrada = screen.getByRole('columnheader', { name: /Proveedor B/ })
    expect(within(columnaCerrada).getByText('Se eligió otra oferta')).toBeInTheDocument()
    expect(screen.queryByText('Sin oferta')).toBeNull()
  })

  it('mis solicitudes marca Cerrada una solicitud que tiene una oferta aceptada', async () => {
    h.getSolicitudesDelComprador.mockResolvedValue([solicitud])
    h.getCotizacionesDelComprador.mockResolvedValue([
      {
        id: 'cot-1',
        solicitud_id: 'sol-1',
        estado: 'aceptada',
        created_at: '2026-10-02T12:00:00.000Z',
      },
    ])

    render(await SolicitudesPage())

    expect(screen.getByText('Cerrada')).toBeInTheDocument()
    expect(screen.queryByText('Respondida')).toBeNull()
    expect(screen.queryByText('Pendiente')).toBeNull()
  })

  it('el encabezado del comparador marca Cerrada una solicitud con oferta aceptada', async () => {
    h.getSolicitudComparador.mockResolvedValue({
      solicitud,
      cotizaciones: [
        {
          id: 'cot-a',
          numero: 1,
          comprador_id: 'buyer-1',
          proveedor_id: 'prov-a',
          estado: 'aceptada',
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
          items: [itemCemento({ cotizacion_id: 'cot-a', precio_ofertado: 100 })],
        },
      ],
    })

    render(await SolicitudComparadorPage({ params: Promise.resolve({ id: 'sol-1' }) }))

    expect(screen.getByText('Materiales obra')).toBeInTheDocument()
    expect(screen.getByText('Cerrada')).toBeInTheDocument()
  })

  it('el encabezado del comparador sigue marcando Cerrada cuando la oferta aceptada ya se despachó', async () => {
    h.getSolicitudComparador.mockResolvedValue({
      solicitud,
      cotizaciones: [
        {
          id: 'cot-a',
          numero: 1,
          comprador_id: 'buyer-1',
          proveedor_id: 'prov-a',
          estado: 'despachada',
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
          items: [itemCemento({ cotizacion_id: 'cot-a', precio_ofertado: 100 })],
        },
      ],
    })

    render(await SolicitudComparadorPage({ params: Promise.resolve({ id: 'sol-1' }) }))

    expect(screen.getByText('Materiales obra')).toBeInTheDocument()
    expect(screen.getByText('Cerrada')).toBeInTheDocument()
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

  it('el comparador muestra cantidad y unidad pedidas junto a la descripción', () => {
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
          items: [
            {
              id: 'item-free',
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
            },
          ],
        },
      ],
    } as unknown as SolicitudComparador

    render(<ComparadorSolicitud data={data} />)

    const encabezado = screen.getByRole('rowheader', { name: /Cemento/ })
    expect(encabezado).toHaveTextContent('Cemento')
    expect(encabezado).toHaveTextContent('(2 sacos)')
  })

  it('el comparador muestra la unidad de catálogo cuando la línea no tiene unidad propia', () => {
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
          items: [
            {
              id: 'item-1',
              cotizacion_id: 'cot-1',
              producto_id: 'prod-1',
              descripcion: null,
              unidad: undefined,
              cantidad: 3,
              cantidad_ofertada: 3,
              precio_ofertado: 50,
              producto: { nombre: 'Bloque', unidad: 'unidad' },
              sujeta_disponibilidad: false,
              stock_al_cotizar: null,
            },
          ],
        },
      ],
    } as unknown as SolicitudComparador

    render(<ComparadorSolicitud data={data} />)

    const encabezado = screen.getByRole('rowheader', { name: /Bloque/ })
    expect(encabezado).toHaveTextContent('(3 unidad)')
  })
})
