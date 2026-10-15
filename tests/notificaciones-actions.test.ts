import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const state = {
    user: { id: 'u-1' } as { id: string } | null,
    authError: null as { message: string } | null,
    updateError: null as { message: string } | null,
  }
  const getUser = vi.fn(async () => ({ data: { user: state.user }, error: state.authError }))
  const query = { update: vi.fn(), eq: vi.fn(), is: vi.fn() }
  query.update.mockImplementation(() => query)
  query.eq.mockImplementation(() => query)
  query.is.mockImplementation(async () => ({ error: state.updateError }))
  const from = vi.fn((_table: string) => query)
  const createClient = vi.fn(async () => ({ auth: { getUser }, from }))

  return { state, getUser, update: query.update, eq: query.eq, is: query.is, from, createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))

import { marcarNotificacionLeida } from '@/app/(marketplace)/notificaciones/actions'

beforeEach(() => {
  mocks.state.user = { id: 'u-1' }
  mocks.state.authError = null
  mocks.state.updateError = null
  vi.clearAllMocks()
})

describe('marcarNotificacionLeida', () => {
  it('marca como leída solo la notificación indicada del usuario autenticado', async () => {
    await expect(marcarNotificacionLeida('n-1')).resolves.toEqual({ error: null })

    expect(mocks.update).toHaveBeenCalledOnce()
    const valores = mocks.update.mock.calls[0][0]
    expect(valores.leida_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(Number.isNaN(Date.parse(valores.leida_at))).toBe(false)
    expect(mocks.eq).toHaveBeenNthCalledWith(1, 'id', 'n-1')
    expect(mocks.eq).toHaveBeenNthCalledWith(2, 'user_id', 'u-1')
    expect(mocks.is).toHaveBeenCalledWith('leida_at', null)
  })

  it('devuelve el error de sesión si no hay usuario autenticado', async () => {
    mocks.state.user = null

    await expect(marcarNotificacionLeida('n-1')).resolves.toEqual({
      error: 'Inicia sesión para ver tus notificaciones.',
    })

    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('devuelve un error si Supabase no puede marcar la notificación', async () => {
    mocks.state.updateError = { message: 'falló la actualización' }

    await expect(marcarNotificacionLeida('n-1')).resolves.toEqual({
      error: 'No se pudo marcar la notificación como leída.',
    })
  })
})
