import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    result: { data: null as unknown, error: null as { message: string } | null },
    from: [] as string[],
    select: [] as string[],
    in: [] as Array<[string, string[]]>,
    eq: [] as Array<[string, unknown]>,
  }
  const createClient = vi.fn(async () => ({
    from(table: string) {
      state.from.push(table)
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
          const data = Array.isArray(state.result.data) && column === 'activo'
            ? state.result.data.filter((row) => typeof row === 'object' && row !== null && 'activo' in row && row.activo === value)
            : state.result.data
          return Promise.resolve({ ...state.result, data })
        },
      }
      return query
    },
  }))
  return { state, createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))

let getProductosActivosPorIds!: typeof import('@/lib/data').getProductosActivosPorIds

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proyecto.supabase.co')
  const data = await import('@/lib/data')
  getProductosActivosPorIds = data.getProductosActivosPorIds
})

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proyecto.supabase.co')
  h.state.result = { data: null, error: null }
  h.state.from.length = 0
  h.state.select.length = 0
  h.state.in.length = 0
  h.state.eq.length = 0
  h.createClient.mockClear()
})

describe('getProductosActivosPorIds', () => {
  it('getProductosActivosPorIds devuelve una lista vacía sin consultar cuando no recibe ids', async () => {
    await expect(getProductosActivosPorIds([])).resolves.toEqual([])
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('getProductosActivosPorIds devuelve solo los productos activos solicitados', async () => {
    const activo = { id: 'prod-1', activo: true }
    const inactivo = { id: 'prod-2', activo: false }
    h.state.result = { data: [activo, inactivo], error: null }

    await expect(getProductosActivosPorIds(['prod-1', 'prod-2'])).resolves.toEqual([activo])
    expect(h.state.from).toEqual(['productos'])
    expect(h.state.in).toEqual([['id', ['prod-1', 'prod-2']]])
    expect(h.state.eq).toEqual([['activo', true]])
  })

  it('getProductosActivosPorIds propaga errores de lectura', async () => {
    const error = { message: 'fallo de lectura' }
    h.state.result = { data: null, error }
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getProductosActivosPorIds(['prod-1'])).rejects.toBe(error)
  })
})
