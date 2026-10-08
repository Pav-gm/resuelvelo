import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    rpcResult: { data: null, error: null } as { data: null; error: { message: string } | null },
  }
  const rpc = vi.fn(async () => state.rpcResult)
  const createClient = vi.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-prov' } } }),
    },
    from: (tabla: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => tabla === 'proveedores'
            ? { data: { id: 'prov-1' }, error: null }
            : { data: null, error: { message: 'tabla inesperada' } },
        }),
      }),
    }),
    rpc,
  }))
  const revalidatePath = vi.fn((_ruta: string) => undefined)
  return { state, rpc, createClient, revalidatePath }
})

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))

import { aceptarCotizacionConCantidades } from '@/app/(marketplace)/proveedor/actions'

beforeEach(() => {
  h.state.rpcResult = { data: null, error: null }
  h.rpc.mockClear()
  h.createClient.mockClear()
  h.revalidatePath.mockClear()
})

describe('aceptarCotizacionConCantidades', () => {
  it('acepta cantidades por línea y revalida las listas cuando el RPC termina bien', async () => {
    const resultado = await aceptarCotizacionConCantidades('cot-1', [
      { itemId: 'item-1', cantidad: 2 },
      { itemId: 'item-2', cantidad: 0 },
    ])

    expect(resultado).toBeNull()
    expect(h.rpc).toHaveBeenCalledWith('aceptar_cotizacion_con_cantidades', {
      p_cotizacion_id: 'cot-1',
      p_cantidades: [
        { item_id: 'item-1', cantidad: 2 },
        { item_id: 'item-2', cantidad: 0 },
      ],
    })
    expect(h.revalidatePath.mock.calls.map(([ruta]) => ruta)).toEqual([
      '/proveedor',
      '/proveedor/pedidos',
      '/mis-cotizaciones',
    ])
  })

  it('devuelve el error del RPC y no revalida cuando falla la aceptación', async () => {
    h.state.rpcResult = {
      data: null,
      error: { message: 'No hay stock disponible de Tubo PVC (disponible: 1, confirmado: 2).' },
    }

    const resultado = await aceptarCotizacionConCantidades('cot-1', [
      { itemId: 'item-1', cantidad: 2 },
    ])

    expect(resultado).toEqual({
      error: 'No hay stock disponible de Tubo PVC (disponible: 1, confirmado: 2).',
    })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('rechaza cantidades inválidas antes de llamar al RPC', async () => {
    const resultado = await aceptarCotizacionConCantidades('cot-1', [
      { itemId: 'item-1', cantidad: -1 },
    ])

    expect(resultado).toEqual({ error: 'Datos de cantidades inválidos.' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })
})
