import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  queries: [] as Array<{ table: string; method?: string; value: unknown; calls: Record<string, unknown[]> }>,
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import {
  actualizarProducto,
  archivarOEliminarProducto,
  crearProducto,
  restaurarProducto,
} from '@/app/(marketplace)/proveedor/actions'

function productoFormData(id?: string): FormData {
  const formData = new FormData()
  if (id) formData.set('id', id)
  formData.set('nombre', 'Tubo PVC')
  formData.set('precio', '0')
  formData.set('unidad', 'unidad')
  formData.set('stock', '5')
  formData.set('categoria_id', 'cat-1')
  formData.set('subcategoria_id', 'sub-1')
  return formData
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.queries = []
})

function configurarAccionProducto({
  producto = { data: { id: 'prod-1' }, error: null },
  items = { data: [{ id: 'item-1' }], error: null },
  escritura = { data: null, error: null },
  consultarItems = true,
}: {
  producto?: { data: unknown; error: unknown }
  items?: { data: unknown; error: unknown }
  escritura?: { data: unknown; error: unknown }
  consultarItems?: boolean
} = {}) {
  const responses = consultarItems
    ? [{ data: { id: 'prov-1' }, error: null }, producto, items, escritura]
    : [{ data: { id: 'prov-1' }, error: null }, producto, escritura]
  const client = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) },
    from: vi.fn((table: string) => {
      const query = { table, method: undefined as string | undefined, value: undefined as unknown, calls: {} as Record<string, unknown[]> }
      const chain = {
        select: (value: unknown) => { query.calls.select = [value]; return chain },
        eq: (...args: unknown[]) => { query.calls.eq = [...(query.calls.eq ?? []), args]; return chain },
        limit: (...args: unknown[]) => { query.calls.limit = args; return chain },
        maybeSingle: () => { query.method = 'maybeSingle'; return chain },
        update: (value: unknown) => { query.method = 'update'; query.value = value; return chain },
        delete: () => { query.method = 'delete'; return chain },
        then: (resolve: (value: unknown) => unknown) => {
          mocks.queries.push(query)
          return Promise.resolve(responses.shift() ?? { data: null, error: null }).then(resolve)
        },
      }
      return chain
    }),
  }
  mocks.createClient.mockResolvedValue(client)
  return client
}

describe('acciones de producto', () => {
  it('crearProducto rechaza precio 0 con el mensaje acordado antes de consultar Supabase', async () => {
    await expect(crearProducto(null, productoFormData())).resolves.toEqual({
      error: 'El precio debe ser mayor que cero.',
    })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('actualizarProducto rechaza precio 0 con el mensaje acordado antes de consultar Supabase', async () => {
    await expect(actualizarProducto(null, productoFormData('prod-1'))).resolves.toEqual({
      error: 'El precio debe ser mayor que cero.',
    })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('archivarOEliminarProducto archiva un producto con cotizaciones y lo desactiva', async () => {
    const client = configurarAccionProducto()

    await expect(archivarOEliminarProducto('prod-1')).resolves.toEqual({ success: true, action: 'archived' })
    const write = mocks.queries.find((query) => query.method === 'update')
    expect(write?.value).toEqual(expect.objectContaining({ archivado_at: expect.any(String), activo: false }))
    expect(client.from).toHaveBeenCalledWith('items_cotizacion')
    expect(mocks.queries.some((query) => query.method === 'delete')).toBe(false)
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/proveedor/productos')
  })

  it('archivarOEliminarProducto elimina un producto sin cotizaciones', async () => {
    const client = configurarAccionProducto({ items: { data: [], error: null } })

    await expect(archivarOEliminarProducto('prod-1')).resolves.toEqual({ success: true, action: 'deleted' })
    expect(mocks.queries.some((query) => query.method === 'delete')).toBe(true)
    expect(client.from).toHaveBeenCalledWith('productos')
  })

  it('archivarOEliminarProducto devuelve el error de consulta sin borrar', async () => {
    configurarAccionProducto({ items: { data: null, error: { message: 'relation missing' } } })

    await expect(archivarOEliminarProducto('prod-1')).resolves.toEqual({ error: 'relation missing' })
    expect(mocks.queries.some((query) => query.method === 'delete' || query.method === 'update')).toBe(false)
  })

  it('archivarOEliminarProducto informa error al fallar la escritura', async () => {
    configurarAccionProducto({ items: { data: [], error: null }, escritura: { data: null, error: { message: 'delete failed' } } })

    await expect(archivarOEliminarProducto('prod-1')).resolves.toEqual({ error: 'delete failed' })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('archivarOEliminarProducto informa que no encontró un producto propio', async () => {
    configurarAccionProducto({ producto: { data: null, error: null } })

    await expect(archivarOEliminarProducto('prod-1')).resolves.toEqual({
      error: 'No se encontró el producto o no tienes permiso para modificarlo.',
    })
    expect(mocks.queries).toHaveLength(2)
  })

  it('restaurarProducto activa y restaura el producto archivado', async () => {
    configurarAccionProducto({ consultarItems: false, escritura: { data: null, error: null } })

    await expect(restaurarProducto('prod-1')).resolves.toEqual({ success: true, action: 'restored' })
    expect(mocks.queries.find((query) => query.method === 'update')?.value).toEqual({ archivado_at: null, activo: true })
  })

  it('restaurarProducto informa error si falla la actualización', async () => {
    configurarAccionProducto({ consultarItems: false, escritura: { data: null, error: { message: 'update failed' } } })

    await expect(restaurarProducto('prod-1')).resolves.toEqual({ error: 'update failed' })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})
