import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    result: { data: null as unknown, error: null as { message: string } | null },
    filtros: [] as { column: string; value: unknown }[],
    ordenes: [] as { column: string; options: { ascending: boolean } }[],
    llamadasLimit: [] as number[],
  }

  const createClient = vi.fn(async () => ({
    from() {
      const api = {
        select() {
          return api
        },
        eq(column: string, value: unknown) {
          state.filtros.push({ column, value })
          return api
        },
        order(column: string, options: { ascending: boolean }) {
          state.ordenes.push({ column, options })
          return api
        },
        limit(cantidad: number) {
          state.llamadasLimit.push(cantidad)
          return api
        },
        then(resolve: (value: typeof state.result) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve(state.result).then(resolve, reject)
        },
      }
      return api
    },
  }))

  return { state, createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))

let getCotizacionesDeProveedor!: typeof import('@/lib/data').getCotizacionesDeProveedor

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proyecto.supabase.co')
  const data = await import('@/lib/data')
  getCotizacionesDeProveedor = data.getCotizacionesDeProveedor
})

beforeEach(() => {
  h.state.result = { data: null, error: null }
  h.state.filtros.length = 0
  h.state.ordenes.length = 0
  h.state.llamadasLimit.length = 0
  h.createClient.mockClear()
})

describe('getCotizacionesDeProveedor', () => {
  it('getCotizacionesDeProveedor devuelve todas las cotizaciones del proveedor sin límite', async () => {
    const cotizaciones = Array.from({ length: 21 }, (_, index) => ({
      id: `cot-${String(index + 1).padStart(2, '0')}`,
      proveedor_id: 'prov-1',
      estado: 'pendiente',
      created_at: '2026-10-01T12:00:00.000Z',
      items: [],
    }))
    h.state.result = { data: cotizaciones, error: null }

    const resultado = await getCotizacionesDeProveedor('prov-1')

    expect(resultado).toHaveLength(21)
    expect(resultado.at(-1)?.id).toBe('cot-21')
    expect(h.state.filtros).toContainEqual({ column: 'proveedor_id', value: 'prov-1' })
    expect(h.state.ordenes).toContainEqual({ column: 'created_at', options: { ascending: false } })
    expect(h.state.llamadasLimit).toEqual([])
  })

  it('getCotizacionesDeProveedor propaga el error cuando falla la consulta', async () => {
    const error = { message: 'fallo de lectura' }
    h.state.result = { data: null, error }
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getCotizacionesDeProveedor('prov-1')).rejects.toBe(error)
  })
})
