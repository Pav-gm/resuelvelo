import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    rpcCalls: [] as { name: string; args: Record<string, unknown> }[],
    response: { data: null as unknown, error: null as { message: string; code?: string } | null },
  }

  const createClient = vi.fn(async () => ({
    rpc(name: string, args: Record<string, unknown>) {
      state.rpcCalls.push({ name, args })
      return Promise.resolve(state.response)
    },
  }))

  return { state, createClient }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: h.createClient,
}))

import type { CotizacionDetalle } from '@/types'

let getCotizacionDetalle!: (cotizacionId: string) => Promise<CotizacionDetalle | null>

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proyecto.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-test')
  const data = await import('@/lib/data')
  getCotizacionDetalle = data.getCotizacionDetalle
})

beforeEach(() => {
  vi.restoreAllMocks()
  h.state.rpcCalls.length = 0
  h.state.response = { data: null, error: null }
  h.createClient.mockClear()
})

describe('getCotizacionDetalle', () => {
  it('getCotizacionDetalle llama la RPC con el id y devuelve el detalle tipado', async () => {
    const detalle = {
      id: 'cot-1',
      numero: 42,
      comprador_id: 'buyer-1',
      proveedor_id: 'prov-1',
      estado: 'pendiente',
      mensaje: null,
      total_estimado: null,
      created_at: '2026-03-15T15:00:00.000Z',
      despachada_at: null,
      cancelada_por: null,
      proveedor: {
        id: 'prov-1',
        nombre_empresa: 'Promeria',
        ciudad: 'Santo Domingo',
        verificado: true,
      },
      comprador: {
        id: 'buyer-1',
        nombre: 'Ana',
        email: 'ana@example.com',
        telefono: null,
      },
      items: [
        {
          id: 'item-1',
          cotizacion_id: 'cot-1',
          producto_id: 'prod-1',
          cantidad: 2,
          precio_unitario: 10,
          sujeta_disponibilidad: false,
          stock_al_cotizar: 5,
          producto: { id: 'prod-1', nombre: 'Tubo PVC' },
        },
      ],
    }
    h.state.response = { data: detalle, error: null }

    await expect(getCotizacionDetalle('cot-1')).resolves.toEqual(detalle)
    expect(h.state.rpcCalls).toEqual([
      { name: 'get_cotizacion_detalle', args: { p_cotizacion_id: 'cot-1' } },
    ])
  })

  it('getCotizacionDetalle devuelve null cuando la RPC no encuentra una cotización accesible', async () => {
    h.state.response = { data: null, error: null }

    await expect(getCotizacionDetalle('cot-privada')).resolves.toBeNull()
  })

  it('getCotizacionDetalle propaga los errores de la RPC', async () => {
    h.state.response = { data: null, error: { message: 'timeout' } }
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getCotizacionDetalle('cot-1')).rejects.toEqual({ message: 'timeout' })
  })

  it('getCotizacionDetalle devuelve null cuando la RPC rechaza a un usuario que no participa', async () => {
    h.state.response = {
      data: null,
      error: { code: 'P0001', message: 'COTIZACION_NO_AUTORIZADA' },
    }

    await expect(getCotizacionDetalle('cot-ajena')).resolves.toBeNull()
  })

  it('getCotizacionDetalle devuelve null cuando el id no es un UUID', async () => {
    h.state.response = {
      data: null,
      error: { code: '22P02', message: 'invalid input syntax for type uuid: "no-es-uuid"' },
    }

    await expect(getCotizacionDetalle('no-es-uuid')).resolves.toBeNull()
  })
})
