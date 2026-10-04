/**
 * Acciones de despacho, cancelación y recepción.
 * Cada una invoca solo su RPC, devuelve el error sin revalidar
 * y no escribe cotizaciones con UPDATE.
 *
 * Pendiente, fuera de estas pruebas: el esquema revoca EXECUTE a public
 * y anon y no concede EXECUTE a authenticated. No se comprobó la base
 * desplegada. El formulario de reseña no está en el checkout.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const COT_ID = 'AbCdEf12-3456-4789-8abc-Def012345678'

const h = vi.hoisted(() => {
  const state = {
    user: { id: 'user-1' } as { id: string } | null,
    authError: null as { message: string } | null,
    authThrows: false,
    rpcError: null as { message: string } | null,
    rpcThrows: false,
    rpcCalls: [] as { name: string; args: unknown }[],
    writes: [] as { op: string; table: string; payload: unknown }[],
    tables: [] as string[],
  }

  interface Chain {
    select: (columns?: string) => Chain
    eq: (column?: string, value?: unknown) => Chain
    update: (payload: unknown) => Chain
    insert: (payload: unknown) => Chain
    delete: () => Chain
    upsert: (payload: unknown) => Chain
    single: () => Promise<{ data: { id: string } | null; error: null }>
    then: (
      onFulfilled?: ((value: { data: null; error: null }) => unknown) | null,
      onRejected?: ((reason: unknown) => unknown) | null,
    ) => Promise<unknown>
  }

  function chain(table: string): Chain {
    state.tables.push(table)
    const builder: Chain = {
      select() {
        return builder
      },
      eq() {
        return builder
      },
      update(payload) {
        state.writes.push({ op: 'update', table, payload })
        return builder
      },
      insert(payload) {
        state.writes.push({ op: 'insert', table, payload })
        return builder
      },
      delete() {
        state.writes.push({ op: 'delete', table, payload: null })
        return builder
      },
      upsert(payload) {
        state.writes.push({ op: 'upsert', table, payload })
        return builder
      },
      async single() {
        return { data: { id: 'prov-1' }, error: null }
      },
      then(onFulfilled, onRejected) {
        return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected)
      },
    }
    return builder
  }

  const createClient = vi.fn(async () => ({
    auth: {
      getUser: async () => {
        if (state.authThrows) throw new Error('fallo de red')
        return { data: { user: state.user }, error: state.authError }
      },
    },
    rpc: async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args })
      if (state.rpcThrows) throw new Error('fallo de red')
      return { data: null, error: state.rpcError }
    },
    from(table: string) {
      return chain(table)
    },
  }))

  const revalidatePath = vi.fn()
  const redirect = vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`)
  })

  return { state, createClient, revalidatePath, redirect }
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

import { cancelarCotizacion, confirmarRecepcion, responderCotizacion } from '@/app/(marketplace)/cotizaciones/actions'
import { cancelarVenta, despacharCotizacion } from '@/app/(marketplace)/proveedor/actions'

const FLUJOS = [
  {
    nombre: 'despacharCotizacion',
    ejecutar: (id: string) => despacharCotizacion(id),
    rpc: 'despachar_cotizacion',
    sesion: 'Inicia sesión para actualizar la venta.',
    fallo: 'No se pudo actualizar la venta.',
    red: 'No se pudo actualizar la venta. Intenta de nuevo.',
  },
  {
    nombre: 'cancelarVenta',
    ejecutar: (id: string) => cancelarVenta(id),
    rpc: 'cancelar_venta',
    sesion: 'Inicia sesión para actualizar la venta.',
    fallo: 'No se pudo actualizar la venta.',
    red: 'No se pudo actualizar la venta. Intenta de nuevo.',
  },
  {
    nombre: 'cancelarCotizacion',
    ejecutar: (id: string) => cancelarCotizacion(id),
    rpc: 'cancelar_venta',
    sesion: 'Inicia sesión para actualizar la cotización.',
    fallo: 'No se pudo actualizar la cotización.',
    red: 'No se pudo actualizar la cotización. Intenta de nuevo.',
  },
  {
    nombre: 'confirmarRecepcion',
    ejecutar: (id: string) => confirmarRecepcion(id),
    rpc: 'confirmar_recepcion',
    sesion: 'Inicia sesión para actualizar la cotización.',
    fallo: 'No se pudo actualizar la cotización.',
    red: 'No se pudo actualizar la cotización. Intenta de nuevo.',
  },
] as const

beforeEach(() => {
  h.state.user = { id: 'user-1' }
  h.state.authError = null
  h.state.authThrows = false
  h.state.rpcError = null
  h.state.rpcThrows = false
  h.state.rpcCalls = []
  h.state.writes = []
  h.state.tables = []
  h.createClient.mockClear()
  h.revalidatePath.mockClear()
  h.redirect.mockClear()
})

describe('seguimiento de venta — solo RPC', () => {
  it.each(FLUJOS)(
    '$nombre invoca $rpc, revalida las dos vistas y no escribe cotizaciones',
    async ({ ejecutar, rpc }) => {
      const result = await ejecutar(COT_ID)

      expect(result).toBeNull()
      expect(h.state.rpcCalls).toEqual([{ name: rpc, args: { p_cotizacion_id: COT_ID } }])
      expect(h.state.writes).toEqual([])
      expect(h.state.tables).toEqual([])
      expect(h.revalidatePath.mock.calls).toEqual([['/proveedor/pedidos'], ['/mis-cotizaciones']])
      expect(h.redirect).not.toHaveBeenCalled()
    },
  )

  it.each(FLUJOS)(
    '$nombre rechaza un id inválido sin abrir sesión ni aparentar éxito',
    async ({ ejecutar }) => {
      const result = await ejecutar('no-es-uuid')

      expect(result).toEqual({ error: 'La cotización indicada no es válida.' })
      expect(h.createClient).not.toHaveBeenCalled()
      expect(h.state.rpcCalls).toEqual([])
      expect(h.state.writes).toEqual([])
      expect(h.revalidatePath).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['vacío', ''],
    ['con espacios', ` ${COT_ID}`],
    ['corto', '11111111-1111-4111-8111-11111111111'],
    ['carácter inválido', '11111111-1111-4111-8111-11111111111g'],
    ['no texto', 15],
  ])('despacharCotizacion rechaza un id %s', async (_nombre, id) => {
    const result = await despacharCotizacion(id as string)

    expect(result).toEqual({ error: 'La cotización indicada no es válida.' })
    expect(h.state.rpcCalls).toEqual([])
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it.each(FLUJOS)(
    '$nombre sin sesión devuelve error y no llama a la RPC',
    async ({ ejecutar, sesion }) => {
      h.state.user = null

      const result = await ejecutar(COT_ID)

      expect(result).toEqual({ error: sesion })
      expect(h.state.rpcCalls).toEqual([])
      expect(h.state.writes).toEqual([])
      expect(h.revalidatePath).not.toHaveBeenCalled()
      expect(h.redirect).not.toHaveBeenCalled()
    },
  )

  it.each(FLUJOS)(
    '$nombre propaga el mensaje de la RPC y no revalida',
    async ({ ejecutar }) => {
      h.state.rpcError = { message: 'Solo puedes despachar una venta aceptada.' }

      const result = await ejecutar(COT_ID)

      expect(result).toEqual({ error: 'Solo puedes despachar una venta aceptada.' })
      expect(h.state.rpcCalls).toHaveLength(1)
      expect(h.state.writes).toEqual([])
      expect(h.revalidatePath).not.toHaveBeenCalled()
    },
  )

  it.each(FLUJOS)(
    '$nombre usa un mensaje propio si la RPC no trae texto',
    async ({ ejecutar, fallo }) => {
      h.state.rpcError = { message: '' }

      await expect(ejecutar(COT_ID)).resolves.toEqual({ error: fallo })
      expect(h.revalidatePath).not.toHaveBeenCalled()
    },
  )

  it.each(FLUJOS)(
    '$nombre convierte un fallo de red en error y no revalida',
    async ({ ejecutar, red }) => {
      h.state.rpcThrows = true

      await expect(ejecutar(COT_ID)).resolves.toEqual({ error: red })
      expect(h.state.writes).toEqual([])
      expect(h.revalidatePath).not.toHaveBeenCalled()
    },
  )

  it.each(FLUJOS)(
    '$nombre convierte un fallo al leer la sesión en error',
    async ({ ejecutar, red }) => {
      h.state.authThrows = true

      await expect(ejecutar(COT_ID)).resolves.toEqual({ error: red })
      expect(h.state.rpcCalls).toEqual([])
      expect(h.revalidatePath).not.toHaveBeenCalled()
    },
  )
})

describe('responder cotización — comportamiento previo', () => {
  it.each(['aceptada', 'rechazada'] as const)(
    'sigue actualizando el estado %s sin usar las RPC de seguimiento',
    async (estado) => {
      await responderCotizacion(COT_ID, estado)

      expect(h.state.rpcCalls).toEqual([])
      expect(h.state.writes).toEqual([
        { op: 'update', table: 'cotizaciones', payload: { estado } },
      ])
      expect(h.revalidatePath.mock.calls).toEqual([['/proveedor'], ['/proveedor/pedidos']])
      expect(h.redirect).not.toHaveBeenCalled()
    },
  )

  it('sin sesión redirige a login y no actualiza la cotización', async () => {
    h.state.user = null

    await expect(responderCotizacion(COT_ID, 'aceptada')).rejects.toThrow('REDIRECT /login')
    expect(h.state.writes).toEqual([])
    expect(h.state.rpcCalls).toEqual([])
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })
})
