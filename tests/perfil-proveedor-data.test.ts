import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    user: { id: 'user-1' } as { id: string } | null,
    result: { data: null as unknown, error: null as { message: string } | null },
    single: { data: null as unknown, error: null as { message: string } | null },
  }
  const createClient = vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from() {
      type Query = {
        select(): Query
        eq(): Query
        order(): Promise<typeof state.result>
        maybeSingle(): Promise<typeof state.single>
      }
      const query: Query = {
        select: () => query,
        eq: () => query,
        order: async () => state.result,
        maybeSingle: async () => state.single,
      }
      return query
    },
  }))
  return { state, createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))

let getPerfilProveedorDelUsuario: typeof import('@/lib/data').getPerfilProveedorDelUsuario
let getProveedores: typeof import('@/lib/data').getProveedores

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proyecto.supabase.co')
  const data = await import('@/lib/data')
  getPerfilProveedorDelUsuario = data.getPerfilProveedorDelUsuario
  getProveedores = data.getProveedores
})

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proyecto.supabase.co')
  h.state.user = { id: 'user-1' }
  h.state.result = { data: [], error: null }
  h.state.single = { data: null, error: null }
  h.createClient.mockClear()
})

describe('lecturas del perfil del proveedor', () => {
  it('getPerfilProveedorDelUsuario devuelve perfil y cobertura ordenada', async () => {
    h.state.single = {
      data: {
        id: 'prov-1', user_id: 'user-1', nombre_empresa: 'Promeria', rnc: null,
        proveedor_zonas: [{ provincia: 'Santiago' }, { provincia: 'Azua' }],
      },
      error: null,
    }

    await expect(getPerfilProveedorDelUsuario()).resolves.toEqual({
      id: 'prov-1', user_id: 'user-1', nombre_empresa: 'Promeria', rnc: null,
      telefono: null, whatsapp: null, horario: null, sitio_web: null,
      verificacion_estado: 'sin_solicitar', verificacion_nota: null,
      verificacion_solicitada_at: null, verificado_at: null,
      zonas_cobertura: ['Azua', 'Santiago'],
    })
  })

  it('getPerfilProveedorDelUsuario devuelve null sin usuario o proveedor', async () => {
    h.state.user = null
    await expect(getPerfilProveedorDelUsuario()).resolves.toBeNull()

    h.state.user = { id: 'user-1' }
    h.state.single = { data: null, error: null }
    await expect(getPerfilProveedorDelUsuario()).resolves.toBeNull()
  })

  it('getProveedores normaliza zonas públicas y conserva proveedores sin zonas', async () => {
    h.state.result = {
      data: [
        {
          id: 'prov-1', nombre_empresa: 'Promeria', productos: [{ count: 2 }],
          proveedor_zonas: [{ provincia: 'Santiago' }, { provincia: 'Azua' }],
        },
        { id: 'prov-2', nombre_empresa: 'Ferretería A', productos: [{ count: 0 }], proveedor_zonas: [] },
      ],
      error: null,
    }

    await expect(getProveedores()).resolves.toEqual([
      expect.objectContaining({ id: 'prov-1', productos_count: 2, zonas_cobertura: ['Azua', 'Santiago'] }),
      expect.objectContaining({ id: 'prov-2', productos_count: 0, zonas_cobertura: [] }),
    ])
  })
})
