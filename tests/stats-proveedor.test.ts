import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  createClient: vi.fn(),
  queries: [] as Array<{ table: string; selection: string; filters: Array<[string, ...unknown[]]> }>,
  responses: [] as unknown[],
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proyecto.supabase.co')
  h.createClient.mockClear()
  h.queries = []
})

function prepararSupabase() {
  const client = {
    from: vi.fn((table: string) => {
      const query = { table, selection: '', filters: [] as Array<[string, ...unknown[]]> }
      const chain = {
        select: (selection: string) => { query.selection = selection; return chain },
        eq: (...args: unknown[]) => { query.filters.push(['eq', ...args]); return chain },
        in: (...args: unknown[]) => { query.filters.push(['in', ...args]); return chain },
        gte: (...args: unknown[]) => { query.filters.push(['gte', ...args]); return chain },
        lt: (...args: unknown[]) => { query.filters.push(['lt', ...args]); return chain },
        then: (resolve: (value: unknown) => unknown) => {
          h.queries.push(query)
          const result = table === 'productos'
            ? { data: [{ activo: true, stock: 10 }, { activo: false, stock: 0 }], error: null }
            : query.selection === 'estado'
              ? { data: [{ estado: 'pendiente' }], error: null }
              : (() => {
                  const response = h.responses.shift() ?? { data: [], error: null }
                  const estadoFilter = query.filters.find(([operator]) => operator === 'in')
                  if (!estadoFilter || !response || typeof response !== 'object' || !('data' in response)) return response
                  const estados = estadoFilter[2] as string[]
                  return {
                    ...response,
                    data: (response.data as Array<{ estado: string }>).filter((cotizacion) => estados.includes(cotizacion.estado)),
                  }
                })()
          return Promise.resolve(result).then(resolve)
        },
      }
      return chain
    }),
  }
  h.createClient.mockResolvedValue(client)
  return client
}

describe('getStatsProveedor', () => {
  it('getStatsProveedor cuenta pedidos y ventas aceptados del mes en hora RD', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-09T12:00:00.000Z'))
    prepararSupabase()
    h.responses = [{
      data: [
        { estado: 'aceptada', items: [{ precio_unitario: 100, cantidad: 2, cantidad_confirmada: 1 }] },
        { estado: 'despachada', items: [{ precio_unitario: 50, cantidad: 3, cantidad_confirmada: 2 }] },
        { estado: 'recibida', items: [{ precio_unitario: 25, cantidad: 4, cantidad_confirmada: 4 }] },
        { estado: 'cancelada', items: [{ precio_unitario: 90, cantidad: 1, cantidad_confirmada: null }] },
      ],
      error: null,
    }]

    try {
      const { getStatsProveedor } = await import('@/lib/data')
      await expect(getStatsProveedor('prov-1')).resolves.toEqual({
        productosActivos: 1,
        cotizacionesPendientes: 1,
        sinStock: 1,
        pedidosEsteMes: 3,
        totalVendidoEsteMes: 300,
      })
      const query = h.queries.find((entry) => entry.selection.startsWith('items:items_cotizacion'))
      expect(query?.filters).toContainEqual(['eq', 'proveedor_id', 'prov-1'])
      expect(query?.filters).toContainEqual(['in', 'estado', ['aceptada', 'despachada', 'recibida']])
      expect(query?.filters).toContainEqual(['gte', 'aceptada_at', '2026-10-01T04:00:00.000Z'])
      expect(query?.filters).toContainEqual(['lt', 'aceptada_at', '2026-11-01T04:00:00.000Z'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('getStatsProveedor devuelve cero pedidos y ventas con Supabase no configurado', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const { getStatsProveedor } = await import('@/lib/data')

    await expect(getStatsProveedor('prov-1')).resolves.toEqual({
      productosActivos: 0,
      cotizacionesPendientes: 0,
      sinStock: 0,
      pedidosEsteMes: 0,
      totalVendidoEsteMes: 0,
    })
    expect(h.createClient).not.toHaveBeenCalled()
  })
})
