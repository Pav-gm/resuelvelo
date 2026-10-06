/**
 * Tests de cotizarDesdeCarrito.
 * Cubren la validación previa a cualquier escritura, la fusión de duplicados
 * contra el stock actual y el flujo válido de inserción que ya existía.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ItemCarrito } from '@/types'

const h = vi.hoisted(() => {
  class RedirectSignal extends Error {
    url: string
    constructor(url: string) {
      super(`REDIRECT ${url}`)
      this.url = url
    }
  }

  const state = {
    user: { id: 'comprador-1' } as { id: string } | null,
    productos: [] as { id: string; proveedor_id: string; precio: number; stock: number; activo: boolean }[],
    queryError: null as { message: string } | null,
    queryThrows: false,
    cotizacionError: null as { message: string } | null,
    itemsError: null as { message: string } | null,
    ops: [] as string[],
    inserts: [] as { table: string; payload: unknown }[],
    selects: [] as { columns: string; ids: string[] }[],
  }

  const createClient = vi.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
    },
    from(table: string) {
      return {
        select(columns: string) {
          return {
            in(_column: string, ids: string[]) {
              state.ops.push('select:productos')
              state.selects.push({ columns, ids: [...ids] })
              if (state.queryThrows) throw new Error('fallo de red')
              if (state.queryError) return { data: null, error: state.queryError }
              return { data: state.productos.filter((producto) => ids.includes(producto.id)), error: null }
            },
          }
        },
        insert(payload: unknown) {
          state.ops.push(`insert:${table}`)
          state.inserts.push({ table, payload })
          if (table === 'cotizaciones') {
            const result = state.cotizacionError
              ? { data: null, error: state.cotizacionError }
              : {
                  data: { id: `cot-${state.inserts.filter((i) => i.table === 'cotizaciones').length}` },
                  error: null,
                }
            return {
              select: () => ({
                single: async () => result,
              }),
            }
          }
          return { error: state.itemsError }
        },
      }
    },
  }))

  const redirect = vi.fn((url: string) => {
    throw new RedirectSignal(url)
  })
  const revalidatePath = vi.fn()

  return { RedirectSignal, state, createClient, redirect, revalidatePath }
})

vi.mock('next/navigation', () => ({
  redirect: h.redirect,
}))

vi.mock('next/cache', () => ({
  revalidatePath: h.revalidatePath,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: h.createClient,
}))

import { cotizarDesdeCarrito } from '@/app/(marketplace)/cotizaciones/actions'

type Outcome =
  | { kind: 'returned'; result: { error: string; noDisponibles?: string[] } | null }
  | { kind: 'redirect'; url: string }

function item(overrides: {
  id?: string
  cantidad?: number
  precio?: number
  proveedor_id?: string
  nombre?: string
  stock?: number
} = {}): ItemCarrito {
  return {
    producto: {
      id: overrides.id ?? '11111111-1111-4111-8111-111111111111',
      proveedor_id: overrides.proveedor_id ?? 'prov-cliente',
      categoria_id: 'cat-1',
      subcategoria_id: null,
      nombre: overrides.nombre ?? 'Tubo PVC',
      precio: overrides.precio ?? 1,
      unidad: 'unidad',
      stock: overrides.stock ?? 999,
      activo: true,
      created_at: '',
    },
    cantidad: overrides.cantidad ?? 1,
  }
}

function formConItems(value: unknown, raw = false) {
  const form = new FormData()
  form.set('items', raw ? String(value) : JSON.stringify(value))
  return form
}

async function ejecutar(form: FormData): Promise<Outcome> {
  try {
    const result = await cotizarDesdeCarrito(null, form)
    return { kind: 'returned', result }
  } catch (error) {
    if (error instanceof h.RedirectSignal) return { kind: 'redirect', url: error.url }
    throw error
  }
}

function productoDb(overrides: {
  id?: string
  proveedor_id?: string
  precio?: number
  stock?: number
  activo?: boolean
} = {}) {
  return {
    id: overrides.id ?? '11111111-1111-4111-8111-111111111111',
    proveedor_id: overrides.proveedor_id ?? 'prov-db',
    precio: overrides.precio ?? 80,
    stock: overrides.stock ?? 10,
    activo: overrides.activo ?? true,
  }
}

beforeEach(() => {
  h.createClient.mockClear()
  h.redirect.mockClear()
  h.revalidatePath.mockClear()
  h.state.user = { id: 'comprador-1' }
  h.state.productos = []
  h.state.queryError = null
  h.state.queryThrows = false
  h.state.cotizacionError = null
  h.state.itemsError = null
  h.state.ops = []
  h.state.inserts = []
  h.state.selects = []
})

describe('cotizarDesdeCarrito — validación antes de escribir', () => {
  it('conserva el nombre exportado', () => {
    expect(cotizarDesdeCarrito.name).toBe('cotizarDesdeCarrito')
  })

  it('sin campo items conserva el error de carrito vacío y no inserta', async () => {
    const outcome = await ejecutar(new FormData())

    expect(outcome).toEqual({ kind: 'returned', result: { error: 'El carrito está vacío.' } })
    expect(h.createClient).not.toHaveBeenCalled()
    expect(h.state.inserts).toEqual([])
    expect(h.redirect).not.toHaveBeenCalled()
  })

  it('una lista vacía conserva el error de carrito vacío y no inserta', async () => {
    const outcome = await ejecutar(formConItems([]))

    expect(outcome).toEqual({ kind: 'returned', result: { error: 'El carrito está vacío.' } })
    expect(h.createClient).not.toHaveBeenCalled()
    expect(h.state.inserts).toEqual([])
  })

  it.each([
    ['JSON inválido', '{', true],
    ['un valor que no es lista', { id: '11111111-1111-4111-8111-111111111111' }, false],
    ['un ítem nulo', [null], false],
    ['un ítem sin producto', [{ cantidad: 1 }], false],
    ['un producto sin id', [{ producto: {}, cantidad: 1 }], false],
    ['un id vacío', [{ producto: { id: '   ' }, cantidad: 1 }], false],
    ['un id que no es texto', [{ producto: { id: 15 }, cantidad: 1 }], false],
    ['cantidad cero', [{ producto: { id: '11111111-1111-4111-8111-111111111111' }, cantidad: 0 }], false],
    ['cantidad negativa', [{ producto: { id: '11111111-1111-4111-8111-111111111111' }, cantidad: -2 }], false],
    ['cantidad fraccionaria', [{ producto: { id: '11111111-1111-4111-8111-111111111111' }, cantidad: 1.5 }], false],
    ['cantidad no numérica', [{ producto: { id: '11111111-1111-4111-8111-111111111111' }, cantidad: '2' }], false],
  ])('%s devuelve { error } sin lanzar ni insertar', async (_nombre, value, raw) => {
    const outcome = await ejecutar(formConItems(value, raw))

    expect(outcome).toEqual({
      kind: 'returned',
      result: { error: 'Datos del carrito inválidos.' },
    })
    expect(h.createClient).not.toHaveBeenCalled()
    expect(h.state.ops).toEqual([])
    expect(h.state.inserts).toEqual([])
    expect(h.redirect).not.toHaveBeenCalled()
  })

  it('un ítem inválido entre ítems válidos rechaza todo el carrito antes de consultar', async () => {
    const outcome = await ejecutar(formConItems([
      item({ id: '11111111-1111-4111-8111-111111111111', cantidad: 1 }),
      { producto: { id: '33333333-3333-4333-8333-333333333333' }, cantidad: 0 },
    ]))

    expect(outcome).toEqual({
      kind: 'returned',
      result: { error: 'Datos del carrito inválidos.' },
    })
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('rechaza una fusión que no cabe en un entero seguro, sin consultar', async () => {
    const outcome = await ejecutar(formConItems([
      item({ cantidad: Number.MAX_SAFE_INTEGER }),
      item({ cantidad: 1 }),
    ]))

    expect(outcome).toEqual({
      kind: 'returned',
      result: { error: 'Datos del carrito inválidos.' },
    })
    expect(h.createClient).not.toHaveBeenCalled()
    expect(h.state.inserts).toEqual([])
  })
})

describe('cotizarDesdeCarrito — stock y duplicados', () => {
  it('un id mock que no es UUID se devuelve como no disponible sin consultar ni insertar', async () => {
    const outcome = await ejecutar(formConItems([
      item({ id: '1', nombre: 'Tubo PVC 4" x 6m (sanitario)' }),
    ]))

    expect(outcome).toEqual({
      kind: 'returned',
      result: {
        error: 'Estos productos ya no están disponibles: Tubo PVC 4" x 6m (sanitario). Los quitamos del carrito.',
        noDisponibles: ['1'],
      },
    })
    expect(h.state.selects).toEqual([])
    expect(h.state.inserts).toEqual([])
  })

  it('un producto con id del seed (sin versión de uuid) se cotiza normalmente', async () => {
    const id = 'd0000000-0000-0000-0000-000000000001'
    h.state.productos = [productoDb({ id, stock: 5 })]

    const outcome = await ejecutar(formConItems([item({ id, cantidad: 1, nombre: 'Tubo PVC 4"' })]))

    expect(outcome).toEqual({ kind: 'redirect', url: '/mis-cotizaciones?enviada=1' })
    expect(h.state.selects.flatMap((s) => s.ids)).toEqual([id])
    expect(h.state.inserts).not.toEqual([])
  })

  it('un producto real inactivo se devuelve como no disponible sin insertar', async () => {
    const id = '11111111-1111-4111-8111-111111111111'
    h.state.productos = [productoDb({ id, activo: false })]

    const outcome = await ejecutar(formConItems([item({ id, nombre: 'Cemento' })]))

    expect(outcome).toEqual({
      kind: 'returned',
      result: {
        error: 'Estos productos ya no están disponibles: Cemento. Los quitamos del carrito.',
        noDisponibles: [id],
      },
    })
    expect(h.state.inserts).toEqual([])
  })

  it('fusiona productos repetidos y compara la suma con el stock antes de insertar', async () => {
    h.state.productos = [productoDb({ stock: 7 })]

    const outcome = await ejecutar(formConItems([
      item({ cantidad: 4, nombre: 'Cemento', precio: 1, proveedor_id: 'cliente-a' }),
      item({ cantidad: 4, nombre: 'Cemento', precio: 1, proveedor_id: 'cliente-b' }),
    ]))

    expect(outcome).toEqual({
      kind: 'returned',
      result: {
        error: 'No hay stock suficiente para Cemento (disponible: 7, solicitado: 8).',
      },
    })
    expect(h.state.selects).toEqual([
      { columns: 'id, proveedor_id, precio, stock, activo', ids: ['11111111-1111-4111-8111-111111111111'] },
    ])
    expect(h.state.ops).toEqual(['select:productos'])
    expect(h.state.inserts).toEqual([])
    expect(h.revalidatePath).not.toHaveBeenCalled()
    expect(h.redirect).not.toHaveBeenCalled()
  })

  it('usa un texto genérico si el producto fusionado no trae nombre', async () => {
    h.state.productos = [productoDb({ stock: 1 })]
    const sinNombre = item({ cantidad: 2 })
    delete (sinNombre.producto as { nombre?: string }).nombre

    const outcome = await ejecutar(formConItems([sinNombre]))

    expect(outcome).toEqual({
      kind: 'returned',
      result: {
        error: 'No hay stock suficiente para uno de los productos (disponible: 1, solicitado: 2).',
      },
    })
    expect(h.state.inserts).toEqual([])
  })

  it('no inserta nada si un producto excede el stock aunque otro quepa', async () => {
    h.state.productos = [
      productoDb({ id: '11111111-1111-4111-8111-111111111111', stock: 5 }),
      productoDb({ id: '33333333-3333-4333-8333-333333333333', stock: 1, proveedor_id: 'prov-db-2' }),
    ]

    const outcome = await ejecutar(formConItems([
      item({ id: '11111111-1111-4111-8111-111111111111', cantidad: 2 }),
      item({ id: '33333333-3333-4333-8333-333333333333', cantidad: 4, proveedor_id: 'otro-cliente' }),
    ]))

    expect(outcome.kind).toBe('returned')
    if (outcome.kind === 'returned') {
      expect(outcome.result?.error).toContain('solicitado: 4')
    }
    expect(h.state.inserts).toEqual([])
  })

  it('devuelve { error } si la consulta de stock falla y no inserta', async () => {
    h.state.queryError = { message: 'permiso denegado' }

    const outcome = await ejecutar(formConItems([item()]))

    expect(outcome).toEqual({
      kind: 'returned',
      result: { error: 'No se pudo validar el stock actual. Intenta de nuevo.' },
    })
    expect(h.state.inserts).toEqual([])
    expect(h.redirect).not.toHaveBeenCalled()
  })

  it('devuelve { error } si la consulta de stock lanza y no inserta', async () => {
    h.state.queryThrows = true

    const outcome = await ejecutar(formConItems([item()]))

    expect(outcome).toEqual({
      kind: 'returned',
      result: { error: 'No se pudo validar el stock actual. Intenta de nuevo.' },
    })
    expect(h.state.ops).toEqual(['select:productos'])
    expect(h.state.inserts).toEqual([])
  })

  it('acepta una cantidad fusionada igual al stock', async () => {
    h.state.productos = [productoDb({ stock: 5, precio: 40, proveedor_id: 'prov-db' })]

    const outcome = await ejecutar(formConItems([
      item({ cantidad: 2, precio: 1 }),
      item({ cantidad: 3, precio: 9 }),
    ]))

    expect(outcome).toEqual({ kind: 'redirect', url: '/mis-cotizaciones?enviada=1' })
    const itemsInsert = h.state.inserts.find((i) => i.table === 'items_cotizacion')
    expect(itemsInsert?.payload).toEqual([
      {
        cotizacion_id: 'cot-1',
        producto_id: '11111111-1111-4111-8111-111111111111',
        cantidad: 5,
        precio_unitario: 40,
      },
    ])
  })
})

describe('cotizarDesdeCarrito — flujo válido y parcial', () => {
  it('inserta con proveedor y precio de la base y redirige', async () => {
    h.state.productos = [productoDb({
      id: '11111111-1111-4111-8111-111111111111',
      proveedor_id: 'prov-db',
      precio: 80,
      stock: 10,
    })]

    const outcome = await ejecutar(formConItems([
      item({
        id: '11111111-1111-4111-8111-111111111111',
        cantidad: 2,
        precio: 1,
        proveedor_id: 'prov-cliente',
        nombre: 'Tubo PVC',
      }),
    ]))

    expect(h.state.ops).toEqual([
      'select:productos',
      'insert:cotizaciones',
      'insert:items_cotizacion',
    ])
    expect(h.state.inserts[0]).toEqual({
      table: 'cotizaciones',
      payload: {
        comprador_id: 'comprador-1',
        proveedor_id: 'prov-db',
        estado: 'pendiente',
        total_estimado: 160,
      },
    })
    expect(h.state.inserts[1]).toEqual({
      table: 'items_cotizacion',
      payload: [
        {
          cotizacion_id: 'cot-1',
          producto_id: '11111111-1111-4111-8111-111111111111',
          cantidad: 2,
          precio_unitario: 80,
        },
      ],
    })
    expect(h.revalidatePath).toHaveBeenCalledWith('/mis-cotizaciones')
    expect(outcome).toEqual({ kind: 'redirect', url: '/mis-cotizaciones?enviada=1' })
  })

  it('crea una cotización por grupo y no usa el precio enviado por el cliente', async () => {
    h.state.productos = [
      productoDb({ id: '11111111-1111-4111-8111-111111111111', proveedor_id: 'prov-db-1', precio: 10, stock: 4 }),
      productoDb({ id: '33333333-3333-4333-8333-333333333333', proveedor_id: 'prov-db-2', precio: 25, stock: 4 }),
    ]

    const outcome = await ejecutar(formConItems([
      item({ id: '11111111-1111-4111-8111-111111111111', cantidad: 2, precio: 999, proveedor_id: 'cliente-1' }),
      item({ id: '33333333-3333-4333-8333-333333333333', cantidad: 1, precio: 1, proveedor_id: 'cliente-2', nombre: 'Cemento' }),
    ]))

    expect(outcome).toEqual({ kind: 'redirect', url: '/mis-cotizaciones?enviada=1' })
    const cotizaciones = h.state.inserts.filter((i) => i.table === 'cotizaciones')
    expect(cotizaciones.map((i) => i.payload)).toEqual([
      {
        comprador_id: 'comprador-1',
        proveedor_id: 'prov-db-1',
        estado: 'pendiente',
        total_estimado: 20,
      },
      {
        comprador_id: 'comprador-1',
        proveedor_id: 'prov-db-2',
        estado: 'pendiente',
        total_estimado: 25,
      },
    ])
  })

  it('conserva el comportamiento parcial cuando falta un id', async () => {
    h.state.productos = [productoDb({
      id: '11111111-1111-4111-8111-111111111111',
      precio: 15,
      stock: 6,
      proveedor_id: 'prov-db',
    })]

    const outcome = await ejecutar(formConItems([
      item({ id: '11111111-1111-4111-8111-111111111111', cantidad: 2, nombre: 'Cemento' }),
      item({ id: '22222222-2222-4222-8222-222222222222', cantidad: 1, nombre: 'Arena' }),
    ]))

    expect(outcome).toEqual({
      kind: 'returned',
      result: {
        error: 'Estos productos ya no están disponibles: Arena. Los quitamos del carrito.',
        noDisponibles: ['22222222-2222-4222-8222-222222222222'],
      },
    })
    expect(h.state.inserts).toEqual([])
    expect(h.redirect).not.toHaveBeenCalled()
  })

  it('si un ítem no está disponible, no inserta los otros ítems válidos', async () => {
    h.state.productos = [productoDb({ id: '11111111-1111-4111-8111-111111111111', precio: 15, stock: 6, proveedor_id: 'prov-db' })]

    const outcome = await ejecutar(formConItems([
      item({ id: '11111111-1111-4111-8111-111111111111', cantidad: 2, precio: 1, proveedor_id: 'cliente', nombre: 'Cemento' }),
      item({ id: '22222222-2222-4222-8222-222222222222', cantidad: 1, precio: 50, proveedor_id: 'cliente', nombre: 'Arena' }),
    ]))

    expect(outcome).toEqual({
      kind: 'returned',
      result: {
        error: 'Estos productos ya no están disponibles: Arena. Los quitamos del carrito.',
        noDisponibles: ['22222222-2222-4222-8222-222222222222'],
      },
    })
    expect(h.state.inserts).toEqual([])
    expect(h.redirect).not.toHaveBeenCalled()
  })

  it('si ningún id existe devuelve el error de productos no disponibles y no redirige', async () => {
    h.state.productos = []

    const outcome = await ejecutar(formConItems([
      item({ id: '22222222-2222-4222-8222-222222222222', cantidad: 1, nombre: 'Producto ausente' }),
    ]))

    expect(outcome).toEqual({
      kind: 'returned',
      result: {
        error: 'Estos productos ya no están disponibles: Producto ausente. Los quitamos del carrito.',
        noDisponibles: ['22222222-2222-4222-8222-222222222222'],
      },
    })
    expect(h.state.inserts).toEqual([])
    expect(h.redirect).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('redirige a login sin consultar productos ni insertar si no hay usuario', async () => {
    h.state.user = null
    h.state.productos = [productoDb()]

    const outcome = await ejecutar(formConItems([item()]))

    expect(outcome).toEqual({ kind: 'redirect', url: '/login' })
    expect(h.createClient).toHaveBeenCalledTimes(1)
    expect(h.state.selects).toEqual([])
    expect(h.state.inserts).toEqual([])
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('si la inserción de la cotización falla devuelve { error } y no redirige', async () => {
    h.state.productos = [productoDb()]
    h.state.cotizacionError = { message: 'conflicto' }

    const outcome = await ejecutar(formConItems([item({ cantidad: 1 })]))

    expect(outcome).toEqual({
      kind: 'returned',
      result: {
        error: 'No se pudo crear la cotización: los productos del carrito ya no están disponibles. Actualiza el catálogo e intenta de nuevo.',
      },
    })
    expect(h.redirect).not.toHaveBeenCalled()
    expect(h.state.inserts.map((i) => i.table)).toEqual(['cotizaciones'])
  })
})
