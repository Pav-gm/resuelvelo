/**
 * Cola de verificaciones de proveedores en el panel de administración:
 * datos de la solicitud y acciones de verificar/rechazar con nota.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  resolverVerificacionProveedor: vi.fn(),
  setProductoActivo: vi.fn(),
  setProductoSubcategoria: vi.fn(),
  getCategorias: vi.fn(),
  getSubcategorias: vi.fn(),
  redirect: vi.fn(),
  tablas: {} as Record<string, unknown>,
}))

interface Consulta {
  data: unknown
  error: null
}

interface QueryBuilder {
  select: () => QueryBuilder
  eq: () => QueryBuilder
  order: () => Promise<Consulta>
  single: () => Promise<Consulta>
  maybeSingle: () => Promise<Consulta>
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: h.getUser },
    from: (tabla: string) => {
      const resultado = async (): Promise<Consulta> => ({ data: h.tablas[tabla] ?? null, error: null })
      const builder: QueryBuilder = {
        select: () => builder,
        eq: () => builder,
        order: resultado,
        single: resultado,
        maybeSingle: resultado,
      }
      return builder
    },
  }),
}))

vi.mock('next/navigation', () => ({ redirect: h.redirect, notFound: vi.fn() }))

vi.mock('@/app/(marketplace)/admin/actions', () => ({
  resolverVerificacionProveedor: h.resolverVerificacionProveedor,
  setProductoActivo: h.setProductoActivo,
  setProductoSubcategoria: h.setProductoSubcategoria,
}))

vi.mock('@/lib/data', () => ({
  getCategorias: h.getCategorias,
  getSubcategorias: h.getSubcategorias,
}))

import AdminPage from '@/app/(marketplace)/admin/page'

const SOLICITUD = {
  id: 'prov-1',
  nombre_empresa: 'Promeria',
  rnc: '101234567',
  telefono: '809-555-0100',
  ciudad: 'Santiago',
  direccion: 'Calle 1',
  verificacion_solicitada_at: '2026-10-09T12:00:00.000Z',
  verificacion_nota: null,
}

beforeEach(() => {
  h.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
  h.getCategorias.mockResolvedValue([])
  h.getSubcategorias.mockResolvedValue([])
  h.tablas.profiles = { rol: 'admin' }
  h.tablas.proveedores = [SOLICITUD]
  h.tablas.productos = []
  h.tablas.cotizaciones = []
})

afterEach(() => {
  cleanup()
  h.getUser.mockReset()
  h.resolverVerificacionProveedor.mockReset()
  h.setProductoActivo.mockReset()
  h.setProductoSubcategoria.mockReset()
  h.getCategorias.mockReset()
  h.getSubcategorias.mockReset()
  h.redirect.mockReset()
})

function fila(): HTMLElement {
  return screen.getByTestId('verificacion-row')
}

describe('cola de verificaciones pendientes', () => {
  it('la cola admin presenta los datos de la solicitud y permite verificar con nota', async () => {
    h.resolverVerificacionProveedor.mockResolvedValue({ success: true })

    render(await AdminPage())

    const filaSol = fila()
    expect(within(filaSol).getByText('Promeria')).toBeInTheDocument()
    expect(within(filaSol).getByText('101234567')).toBeInTheDocument()
    expect(within(filaSol).getByText('809-555-0100')).toBeInTheDocument()
    expect(within(filaSol).getByText('Santiago')).toBeInTheDocument()
    expect(within(filaSol).getByText('Calle 1')).toBeInTheDocument()
    expect(within(filaSol).getByText(/9 de octubre de 2026/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nota'), {
      target: { value: 'RNC y teléfono revisados' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar' }))

    await waitFor(() =>
      expect(h.resolverVerificacionProveedor).toHaveBeenCalledWith(
        'prov-1',
        'verificado',
        'RNC y teléfono revisados'
      )
    )
  })

  it('la cola admin permite rechazar con nota y muestra errores de la acción', async () => {
    h.resolverVerificacionProveedor.mockResolvedValue({ error: 'No autorizado.' })

    render(await AdminPage())

    fireEvent.change(screen.getByLabelText('Nota'), {
      target: { value: 'RNC ilegible' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))

    await waitFor(() =>
      expect(h.resolverVerificacionProveedor).toHaveBeenCalledWith(
        'prov-1',
        'rechazado',
        'RNC ilegible'
      )
    )
    expect(await screen.findByText('No autorizado.')).toBeInTheDocument()
  })
})
