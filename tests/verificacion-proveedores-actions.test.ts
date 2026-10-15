import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    user: { id: 'user-1' } as { id: string } | null,
    provider: { id: 'prov-1', rnc: '101234567', telefono: '809-555-0100', verificacion_estado: 'sin_solicitar', verificado: false } as Record<string, unknown> | null,
    role: 'proveedor',
    rpcError: null as { message: string } | null,
    updateError: null as { message: string } | null,
    updateResult: { id: 'prov-1' } as { id: string } | null,
    rpcCalls: [] as string[],
    updates: [] as Array<{ value: unknown; filters: Array<[string, unknown]> }>,
  }
  const createClient = vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    rpc: async (name: string) => { state.rpcCalls.push(name); return { error: state.rpcError } },
    from(table: string) {
      let operation = 'select'
      let value: unknown
      const filters: Array<[string, unknown]> = []
      type Query = {
        select: () => Query
        update: (next: unknown) => Query
        eq: (column: string, next: unknown) => Query
        single: () => Promise<{ data: Record<string, unknown> | null; error: null }>
        maybeSingle: () => Promise<{
          data: Record<string, unknown> | null
          error: { message: string } | null
        }>
      }
      const query: Query = {
        select: () => query,
        update: (next: unknown) => { operation = 'update'; value = next; return query },
        eq: (column: string, next: unknown) => { filters.push([column, next]); return query },
        single: async () => ({ data: table === 'profiles' ? { rol: state.role } : state.provider, error: null }),
        maybeSingle: async () => {
          if (operation === 'update') {
            state.updates.push({ value, filters: [...filters] })
            return { data: state.updateError ? null : state.updateResult, error: state.updateError }
          }
          return { data: state.provider, error: null }
        },
      }
      return query
    },
  }))
  return { state, createClient, revalidatePath: vi.fn() }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))

import { resolverVerificacionProveedor } from '@/app/(marketplace)/admin/actions'
import { solicitarVerificacionProveedor } from '@/app/(marketplace)/proveedor/actions'

beforeEach(() => {
  h.state.user = { id: 'user-1' }
  h.state.provider = { id: 'prov-1', rnc: '101234567', telefono: '809-555-0100', verificacion_estado: 'sin_solicitar', verificado: false }
  h.state.role = 'proveedor'
  h.state.rpcError = null
  h.state.updateError = null
  h.state.updateResult = { id: 'prov-1' }
  h.state.rpcCalls.length = 0
  h.state.updates.length = 0
  h.createClient.mockClear()
  h.revalidatePath.mockReset()
})

describe('acciones de verificación de proveedores', () => {
  it('solicitarVerificacionProveedor exige RNC y teléfono antes de llamar al RPC', async () => {
    h.state.provider = { id: 'prov-1', rnc: null, telefono: '809-555-0100', verificacion_estado: 'sin_solicitar' }
    await expect(solicitarVerificacionProveedor()).resolves.toEqual({
      error: 'Completa el RNC y el teléfono en tu perfil antes de solicitar la verificación.',
    })
    expect(h.state.rpcCalls).toEqual([])
  })

  it('solicitarVerificacionProveedor solicita la revisión para un proveedor elegible', async () => {
    await expect(solicitarVerificacionProveedor()).resolves.toEqual({ success: true })
    expect(h.state.rpcCalls).toEqual(['solicitar_verificacion_proveedor'])
    expect(h.revalidatePath.mock.calls).toEqual([['/proveedor'], ['/proveedor/perfil']])
  })

  it('solicitarVerificacionProveedor no vuelve a enviar una solicitud pendiente', async () => {
    h.state.provider = { ...h.state.provider!, verificacion_estado: 'pendiente' }
    await expect(solicitarVerificacionProveedor()).resolves.toEqual({
      error: 'Solo puedes solicitar la verificación si está sin solicitar o fue rechazada.',
    })
    expect(h.state.rpcCalls).toEqual([])
  })

  it('resolverVerificacionProveedor rechaza a quien no es admin y notas vacías', async () => {
    await expect(resolverVerificacionProveedor('prov-1', 'verificado', 'Correcto')).resolves.toEqual({ error: 'No autorizado.' })
    h.state.role = 'admin'
    await expect(resolverVerificacionProveedor('prov-1', 'rechazado', '   ')).resolves.toEqual({
      error: 'La nota es obligatoria y no puede superar 1000 caracteres.',
    })
    expect(h.state.updates).toEqual([])
  })

  it('resolverVerificacionProveedor aprueba una solicitud pendiente con fecha y nota', async () => {
    h.state.user = { id: 'admin-1' }
    h.state.role = 'admin'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-09T12:00:00.000Z'))

    await expect(resolverVerificacionProveedor('prov-1', 'verificado', 'RNC y teléfono revisados')).resolves.toEqual({ success: true })
    expect(h.state.updates).toEqual([{
      value: {
        verificacion_estado: 'verificado',
        verificacion_nota: 'RNC y teléfono revisados',
        verificado_at: '2026-10-09T12:00:00.000Z',
      },
      filters: [['id', 'prov-1'], ['verificacion_estado', 'pendiente']],
    }])
    expect(h.revalidatePath.mock.calls).toEqual([['/admin'], ['/proveedor'], ['/proveedores']])
    vi.useRealTimers()
  })
})
