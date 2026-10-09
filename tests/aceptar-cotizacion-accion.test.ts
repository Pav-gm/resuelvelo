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
  const enviarNotificacionCotizacionEmail = vi.fn(async () => undefined)
  return { state, rpc, createClient, revalidatePath, enviarNotificacionCotizacionEmail }
})

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('@/lib/notificaciones-email', () => ({
  enviarNotificacionCotizacionEmail: h.enviarNotificacionCotizacionEmail,
}))

import { aceptarCotizacionConCantidades } from '@/app/(marketplace)/proveedor/actions'

beforeEach(() => {
  h.state.rpcResult = { data: null, error: null }
  h.rpc.mockClear()
  h.createClient.mockClear()
  h.revalidatePath.mockClear()
  h.enviarNotificacionCotizacionEmail.mockClear()
})

describe('aceptarCotizacionConCantidades', () => {
  it('aceptarCotizacionConCantidades devuelve error porque el proveedor no puede aceptar', async () => {
    const resultado = await aceptarCotizacionConCantidades('cot-1', [
      { itemId: 'item-1', cantidad: 2 },
    ])

    expect(resultado).toEqual({ error: 'Solo el comprador puede aceptar una oferta respondida.' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
    expect(h.enviarNotificacionCotizacionEmail).not.toHaveBeenCalled()
  })
})
