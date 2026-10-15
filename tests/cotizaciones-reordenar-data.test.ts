import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    result: { data: null as unknown, error: null as { message: string } | null },
    from: [] as string[],
    select: [] as string[],
    in: [] as Array<[string, string[]]>,
    eq: [] as Array<[string, unknown]>,
    order: [] as Array<[string, unknown]>,
    results: {} as Record<string, { data: unknown; error: { message: string } | null }>,
  }
  const createClient = vi.fn(async () => ({
    from(table: string) {
      state.from.push(table)
      const filters: Array<[string, unknown]> = []
      const query = {
        select(columns: string) {
          state.select.push(columns)
          return query
        },
        in(column: string, values: string[]) {
          state.in.push([column, values])
          return query
        },
        eq(column: string, value: unknown) {
          state.eq.push([column, value])
          filters.push([column, value])
          return query
        },
        order(column: string, options: unknown) {
          state.order.push([column, options])
          return query
        },
        maybeSingle() {
          const result = state.results[table] ?? state.result
          return Promise.resolve({
            ...result,
            data: Array.isArray(result.data) ? result.data[0] ?? null : result.data,
          })
        },
        then(
          resolve: (value: { data: unknown; error: { message: string } | null }) => unknown,
          reject: (reason: unknown) => unknown
        ) {
          const result = state.results[table] ?? state.result
          const activoFilter = filters.find(([column]) => column === 'activo')
          const data = Array.isArray(result.data) && activoFilter
            ? result.data.filter((row) => typeof row === 'object' && row !== null && 'activo' in row && row.activo === activoFilter[1])
            : result.data
          return Promise.resolve({ ...result, data }).then(resolve, reject)
        },
      }
      return query
    },
  }))
  return { state, createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))

let getProductosActivosPorIds!: typeof import('@/lib/data').getProductosActivosPorIds
let getCotizacionesDeProveedor!: typeof import('@/lib/data').getCotizacionesDeProveedor
let getCotizacionesDelComprador!: typeof import('@/lib/data').getCotizacionesDelComprador
let getSolicitudComparador!: typeof import('@/lib/data').getSolicitudComparador
let getUnidadesDeProductos!: typeof import('@/lib/data').getUnidadesDeProductos

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proyecto.supabase.co')
  const data = await import('@/lib/data')
  getProductosActivosPorIds = data.getProductosActivosPorIds
  getCotizacionesDeProveedor = data.getCotizacionesDeProveedor
  getCotizacionesDelComprador = data.getCotizacionesDelComprador
  getSolicitudComparador = data.getSolicitudComparador
  getUnidadesDeProductos = data.getUnidadesDeProductos
})

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proyecto.supabase.co')
  h.state.result = { data: null, error: null }
  h.state.from.length = 0
  h.state.select.length = 0
  h.state.in.length = 0
  h.state.eq.length = 0
  h.state.order.length = 0
  h.state.results = {}
  h.createClient.mockClear()
})

describe('unidades de productos en cotizaciones', () => {
  it('las consultas de cotizaciones incluyen la unidad en la relación de producto', async () => {
    h.state.results = {
      solicitudes: { data: [{ id: 'sol-1' }], error: null },
      cotizaciones: { data: [], error: null },
    }

    await getCotizacionesDeProveedor('prov-1')
    await getCotizacionesDelComprador('comp-1')
    await getSolicitudComparador('sol-1')

    expect(h.state.select[0]).toContain('producto:productos(nombre, precio, stock, stock_reservado, unidad)')
    expect(h.state.select[1]).toContain('producto:productos(nombre, precio, unidad)')
    expect(h.state.select[3]).toContain('producto:productos(nombre, unidad)')
  })

  it('getUnidadesDeProductos devuelve las unidades consultadas por id', async () => {
    h.state.result = { data: [{ id: 'prod-1', unidad: 'saco' }], error: null }

    await expect(getUnidadesDeProductos(['prod-1'])).resolves.toEqual({ 'prod-1': 'saco' })
    expect(h.state.from).toEqual(['productos'])
    expect(h.state.select).toEqual(['id, unidad'])
  })

  it('getUnidadesDeProductos devuelve un objeto vacío sin consultar cuando no recibe ids', async () => {
    await expect(getUnidadesDeProductos([])).resolves.toEqual({})
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('getUnidadesDeProductos devuelve un objeto vacío si falla la lectura', async () => {
    h.state.result = { data: null, error: { message: 'fallo' } }

    await expect(getUnidadesDeProductos(['prod-1'])).resolves.toEqual({})
  })
})

describe('getProductosActivosPorIds', () => {
  it('getProductosActivosPorIds devuelve una lista vacía sin consultar cuando no recibe ids', async () => {
    await expect(getProductosActivosPorIds([])).resolves.toEqual([])
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('getProductosActivosPorIds devuelve solo los productos activos solicitados', async () => {
    const activo = { id: 'prod-1', activo: true, proveedor: null }
    const inactivo = { id: 'prod-2', activo: false }
    h.state.result = { data: [activo, inactivo], error: null }

    await expect(getProductosActivosPorIds(['prod-1', 'prod-2'])).resolves.toEqual([
      { id: 'prod-1', activo: true, proveedor: undefined },
    ])
    expect(h.state.from).toEqual(['productos'])
    expect(h.state.select).toEqual(['*, proveedor:proveedores(*)'])
    expect(h.state.in).toEqual([['id', ['prod-1', 'prod-2']]])
    expect(h.state.eq).toEqual([['activo', true]])
  })

  it('getProductosActivosPorIds normaliza la relación proveedor nula a undefined', async () => {
    h.state.result = { data: [{ id: 'prod-1', activo: true, proveedor: null }], error: null }

    await expect(getProductosActivosPorIds(['prod-1'])).resolves.toEqual([
      { id: 'prod-1', activo: true, proveedor: undefined },
    ])
    expect(h.state.from).toEqual(['productos'])
    expect(h.state.select).toEqual(['*, proveedor:proveedores(*)'])
    expect(h.state.eq).toEqual([['activo', true]])
  })

  it('getProductosActivosPorIds propaga errores de lectura', async () => {
    const error = { message: 'fallo de lectura' }
    h.state.result = { data: null, error }
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getProductosActivosPorIds(['prod-1'])).rejects.toBe(error)
  })
})
