import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    result: { data: null as unknown, error: null as { message: string } | null },
    selects: [] as { table: string; columns: string }[],
    filtros: [] as { table: string; column: string; value: unknown }[],
  }
  const createClient = vi.fn(async () => ({
    from(table: string) {
      const api = {
        select(columns: string) {
          state.selects.push({ table, columns })
          return api
        },
        eq(column: string, value: unknown) {
          state.filtros.push({ table, column, value })
          if (table !== 'productos') return api
          return Object.assign(Promise.resolve(state.result), {
            maybeSingle: () => Promise.resolve(state.result),
          })
        },
        order() {
          return Promise.resolve(state.result)
        },
      }
      return api
    },
  }))
  return { state, createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))

let getCategorias!: typeof import('@/lib/data').getCategorias
let getProductos!: typeof import('@/lib/data').getProductos
let getProducto!: typeof import('@/lib/data').getProducto
let getProveedores!: typeof import('@/lib/data').getProveedores
let getSubcategorias!: typeof import('@/lib/data').getSubcategorias

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proyecto.supabase.co')
  const data = await import('@/lib/data')
  getCategorias = data.getCategorias
  getProducto = data.getProducto
  getProductos = data.getProductos
  getProveedores = data.getProveedores
  getSubcategorias = data.getSubcategorias
})

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proyecto.supabase.co')
  h.state.result = { data: null, error: null }
  h.state.selects.length = 0
  h.state.filtros.length = 0
  h.createClient.mockClear()
  vi.restoreAllMocks()
})

describe('lecturas de datos con Supabase configurado', () => {
  it('getProductos propaga el error de Supabase sin devolver mocks', async () => {
    const error = { message: 'relation missing' }
    h.state.result = { data: null, error }
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getProductos()).rejects.toBe(error)
    expect(errorLog).toHaveBeenCalled()
  })

  it('getCategorias y getSubcategorias propagan errores de Supabase', async () => {
    const error = { message: 'relation missing' }
    h.state.result = { data: null, error }
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getCategorias()).rejects.toBe(error)
    await expect(getSubcategorias()).rejects.toBe(error)
    expect(errorLog).toHaveBeenCalledTimes(2)
  })

  it('getProveedores cuenta solo productos activos', async () => {
    h.state.result = {
      data: [{
        id: 'prov-1',
        nombre_empresa: 'Ferretería A',
        productos: [{ count: 2, activo: true }, { count: 1, activo: true }, { count: 1, activo: false }],
      }],
      error: null,
    }

    const proveedores = await getProveedores()

    expect(h.state.filtros).toContainEqual({ table: 'proveedores', column: 'productos.activo', value: true })
    expect(proveedores).toContainEqual(expect.objectContaining({ nombre_empresa: 'Ferretería A', productos_count: 2 }))
  })

  it('getProducto devuelve null si no existe la fila', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getProducto('11111111-1111-4111-8111-111111111111')).resolves.toBeNull()
    expect(errorLog).not.toHaveBeenCalled()
  })
})
