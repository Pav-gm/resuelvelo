/**
 * Panel de administración: precios y fechas se muestran con los formatos
 * dominicanos unificados (`RD$ 1,234.56` y fecha en hora de Santo Domingo).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'

const h = vi.hoisted(() => ({
  estado: { user: { id: 'admin-1' } as { id: string } | null },
  datos: {} as Record<string, { data: unknown; error: unknown }>,
  redirect: vi.fn(),
  getCategorias: vi.fn(),
  getSubcategorias: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: h.redirect }))

vi.mock('@/lib/data', () => ({
  getCategorias: h.getCategorias,
  getSubcategorias: h.getSubcategorias,
}))

// Cliente de Supabase encadenable: `select/order/eq` devuelven el propio
// constructor (que además es «thenable») y `single` resuelve el fixture.
vi.mock('@/lib/supabase/server', () => {
  function crear(tabla: string) {
    let clave = tabla
    const resultado = () => h.datos[clave] ?? { data: [], error: null }
    const builder: Record<string, unknown> = {}
    builder.select = (columnas?: string) => {
      if (tabla === 'proveedores') {
        clave =
          columnas && columnas.includes('verificacion_solicitada_at')
            ? 'solicitudes'
            : 'proveedores'
      }
      return builder
    }
    builder.order = () => builder
    builder.eq = () => builder
    builder.single = () => Promise.resolve(resultado())
    builder.then = (resolve: (valor: unknown) => unknown) =>
      Promise.resolve(resultado()).then(resolve)
    return builder
  }
  return {
    createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: h.estado.user } }) },
      from: (tabla: string) => crear(tabla),
    }),
  }
})

vi.mock('@/components/marketplace/AdminProductoSubcategoria', () => ({ default: () => null }))
vi.mock('@/components/marketplace/AdminVerificacionAcciones', () => ({ default: () => null }))
vi.mock('@/app/(marketplace)/admin/ToggleActivoButton', () => ({ default: () => null }))

import AdminPage from '@/app/(marketplace)/admin/page'

beforeEach(() => {
  vi.clearAllMocks()
  h.estado.user = { id: 'admin-1' }
  h.datos = {
    profiles: { data: { rol: 'admin' }, error: null },
    proveedores: { data: [], error: null },
    solicitudes: {
      data: [
        {
          id: 'prov-1',
          nombre_empresa: 'Promeria',
          rnc: '101234567',
          telefono: '809-555-0100',
          ciudad: 'Santiago',
          direccion: 'Calle 1',
          verificacion_solicitada_at: '2026-10-08T02:20:00.000Z',
          verificacion_nota: null,
        },
      ],
      error: null,
    },
    productos: {
      data: [
        {
          id: 'prod-1',
          nombre: 'Tubo PVC',
          precio: 1234.5,
          stock: 8,
          activo: true,
          categoria_id: 'cat-1',
          subcategoria_id: null,
          proveedor: { nombre_empresa: 'Promeria' },
        },
      ],
      error: null,
    },
    cotizaciones: {
      data: [
        {
          id: 'cot-1',
          estado: 'pendiente',
          total_estimado: 2469,
          comprador: { nombre: 'Ana' },
          proveedor: { nombre_empresa: 'Promeria' },
          items: [],
        },
      ],
      error: null,
    },
  }
  h.getCategorias.mockResolvedValue([{ id: 'cat-1', nombre: 'Plomería' }])
  h.getSubcategorias.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
})

describe('Panel de administración — precios y fechas', () => {
  it('admin muestra precios y fechas en formatos dominicanos', async () => {
    render(await AdminPage())

    expect(screen.getByText(/RD\$ 1,234\.50/)).toBeInTheDocument()
    expect(screen.getByText('RD$ 2,469.00')).toBeInTheDocument()
    expect(screen.getByText('Solicitada el 7 de octubre de 2026')).toBeInTheDocument()
  })

  it('admin muestra un guion cuando la cotización no tiene total estimado', async () => {
    h.datos.cotizaciones = {
      data: [
        {
          id: 'cot-2',
          estado: 'pendiente',
          total_estimado: null,
          comprador: { nombre: 'Ana' },
          proveedor: { nombre_empresa: 'Promeria' },
          items: [],
        },
      ],
      error: null,
    }

    render(await AdminPage())

    expect(screen.queryByText('RD$ 0.00')).not.toBeInTheDocument()
    const contenedorPrecio = screen.getByText('Pendiente').closest('div') as HTMLElement
    expect(within(contenedorPrecio).getByText('—')).toBeInTheDocument()
  })
})
