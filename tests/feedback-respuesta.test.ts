import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const state = {
    proveedor: { id: 'prov-1' } as { id: string } | null,
    proveedorError: null as { message: string } | null,
    updateError: null as { message: string } | null,
    updated: [{ id: 'fb-1' }] as Array<{ id: string }> | null,
    updateValues: null as Record<string, string> | null,
    filtros: [] as Array<{ method: string; column: string; value?: unknown }>,
    revalidaciones: [] as string[],
    user: { id: 'user-prov' } as { id: string } | null,
  }
  const createClient = vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from(table: string) {
      if (table === 'proveedores') {
        const query = {
          select: () => query,
          eq: (column: string, value: unknown) => {
            state.filtros.push({ method: 'eq', column, value })
            return query
          },
          maybeSingle: async () => ({ data: state.proveedor, error: state.proveedorError }),
        }
        return query
      }
      const query = {
        update: (values: Record<string, string>) => {
          state.updateValues = values
          return query
        },
        eq: (column: string, value: unknown) => {
          state.filtros.push({ method: 'eq', column, value })
          return query
        },
        is: (column: string, value: unknown) => {
          state.filtros.push({ method: 'is', column, value })
          return query
        },
        select: async () => ({ data: state.updated, error: state.updateError }),
      }
      return query
    },
  }))
  return { state, createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('next/cache', () => ({ revalidatePath: (path: string) => mocks.state.revalidaciones.push(path) }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) } }))

import { responderFeedbackProveedor } from '@/app/(marketplace)/proveedor/actions'

describe('responderFeedbackProveedor', () => {
  beforeEach(() => {
    mocks.state.proveedor = { id: 'prov-1' }
    mocks.state.proveedorError = null
    mocks.state.updateError = null
    mocks.state.updated = [{ id: 'fb-1' }]
    mocks.state.updateValues = null
    mocks.state.filtros = []
    mocks.state.revalidaciones = []
    mocks.state.user = { id: 'user-prov' }
    mocks.createClient.mockClear()
  })

  it('responderFeedbackProveedor guarda una respuesta recortada para el proveedor propietario', async () => {
    const resultado = await responderFeedbackProveedor('fb-1', '  Gracias por compartir tu experiencia.  ')

    expect(resultado).toEqual({ success: true })
    expect(mocks.state.updateValues).toMatchObject({
      respuesta: 'Gracias por compartir tu experiencia.',
      respuesta_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    })
    expect(mocks.state.filtros).toContainEqual({ method: 'eq', column: 'id', value: 'fb-1' })
    expect(mocks.state.filtros).toContainEqual({ method: 'eq', column: 'user_id', value: 'user-prov' })
    expect(mocks.state.filtros).toContainEqual({ method: 'eq', column: 'proveedor_id', value: 'prov-1' })
    expect(mocks.state.filtros).toContainEqual({ method: 'is', column: 'respuesta', value: null })
    expect(mocks.state.revalidaciones).toEqual(['/proveedor', '/proveedores/prov-1'])
  })

  it('responderFeedbackProveedor rechaza respuestas vacías o mayores de mil caracteres', async () => {
    await expect(responderFeedbackProveedor('fb-1', '   ')).resolves.toEqual({
      error: 'FEEDBACK_RESPUESTA_VALIDACION',
    })
    await expect(responderFeedbackProveedor('fb-1', 'x'.repeat(1001))).resolves.toEqual({
      error: 'FEEDBACK_RESPUESTA_VALIDACION',
    })
    expect(mocks.state.updateValues).toBeNull()
  })

  it('responderFeedbackProveedor impide responder una reseña ya respondida o ajena', async () => {
    mocks.state.updated = []

    await expect(responderFeedbackProveedor('fb-1', 'Gracias')).resolves.toEqual({
      error: 'FEEDBACK_NO_DISPONIBLE',
    })
    expect(mocks.state.revalidaciones).toEqual([])
  })

  it('responderFeedbackProveedor informa errores de Supabase', async () => {
    mocks.state.updateError = { message: 'timeout' }

    await expect(responderFeedbackProveedor('fb-1', 'Gracias')).resolves.toEqual({
      error: 'FEEDBACK_RESPUESTA_ERROR',
    })
  })
})
