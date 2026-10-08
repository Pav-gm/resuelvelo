import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const signOut = vi.fn(async () => ({ error: null }))
  const createClient = vi.fn(async () => ({ auth: { signOut } }))
  const revalidatePath = vi.fn()
  const redirect = vi.fn((ruta: string): never => {
    throw new Error(`REDIRECT ${ruta}`)
  })

  return { signOut, createClient, revalidatePath, redirect }
})

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('next/navigation', () => ({ redirect: h.redirect }))
vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))

import { cerrarSesion } from '@/app/(auth)/actions'

beforeEach(() => {
  h.signOut.mockClear()
  h.createClient.mockClear()
  h.revalidatePath.mockClear()
  h.redirect.mockClear()
})

describe('cerrarSesion', () => {
  it('cerrarSesion elimina la sesión y redirige a /login', async () => {
    await expect(cerrarSesion()).rejects.toThrow('REDIRECT /login')

    expect(h.signOut).toHaveBeenCalledTimes(1)
    expect(h.revalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(h.redirect).toHaveBeenCalledWith('/login')
  })
})
