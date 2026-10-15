import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    user: { id: 'user-1' } as { id: string } | null,
    provider: { id: 'prov-1' } as { id: string } | null,
    updateError: null as { message: string } | null,
    events: [] as Array<{ table: string; operation: string; value?: unknown; filters: Array<[string, unknown]> }>,
  }
  const createClient = vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from(table: string) {
      let operation = 'read'
      let value: unknown
      const filters: Array<[string, unknown]> = []
      type Query = {
        select(): Query
        update(next: unknown): Query
        delete(): Query
        insert(next: unknown): Query
        eq(column: string, next: unknown): Query
        maybeSingle(): Promise<{ data: { id: string } | null; error: null }>
        then(
          resolve: (result: { error: { message: string } | null }) => unknown,
          reject?: (error: unknown) => unknown
        ): Promise<unknown>
      }
      const query: Query = {
        select: () => query,
        update(next: unknown) { operation = 'update'; value = next; return query },
        delete() { operation = 'delete'; return query },
        insert(next: unknown) { operation = 'insert'; value = next; return query },
        eq(column: string, next: unknown) { filters.push([column, next]); return query },
        maybeSingle: async () => ({ data: state.provider, error: null }),
        then(resolve: (result: { error: { message: string } | null }) => unknown, reject?: (error: unknown) => unknown) {
          state.events.push({ table, operation, ...(value === undefined ? {} : { value }), filters })
          return Promise.resolve({ error: operation === 'update' ? state.updateError : null }).then(resolve, reject)
        },
      }
      return query
    },
  }))
  return { state, createClient, redirect: vi.fn(), revalidatePath: vi.fn() }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('next/navigation', () => ({ redirect: h.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))

import { guardarPerfilProveedor } from '@/app/(marketplace)/proveedor/actions'

function perfilForm(values: Record<string, string>, zonas: string[] = []): FormData {
  const formData = new FormData()
  Object.entries(values).forEach(([key, value]) => formData.set(key, value))
  zonas.forEach((zona) => formData.append('zonas', zona))
  return formData
}

beforeEach(() => {
  h.state.user = { id: 'user-1' }
  h.state.provider = { id: 'prov-1' }
  h.state.updateError = null
  h.state.events.length = 0
  h.createClient.mockClear()
  h.redirect.mockReset()
  h.revalidatePath.mockReset()
})

describe('guardarPerfilProveedor', () => {
  it('guardarPerfilProveedor redirige a login si no hay sesión', async () => {
    h.state.user = null
    h.redirect.mockImplementation(() => { throw new Error('NEXT_REDIRECT') })

    await expect(guardarPerfilProveedor({ success: true }, new FormData())).rejects.toThrow('NEXT_REDIRECT')

    expect(h.redirect).toHaveBeenCalledWith('/login')
    expect(h.state.events).toEqual([])
  })

  it('guardarPerfilProveedor exige el nombre de empresa', async () => {
    const result = await guardarPerfilProveedor({ success: true }, perfilForm({ nombre_empresa: '  ' }, ['Santiago']))

    expect(result).toEqual({ error: 'El nombre de empresa es obligatorio.' })
    expect(h.state.events).toEqual([])
  })

  it('guardarPerfilProveedor rechaza provincias fuera del catálogo', async () => {
    const result = await guardarPerfilProveedor({ success: true }, perfilForm({ nombre_empresa: 'Promeria' }, ['Atlantis']))

    expect(result).toEqual({ error: 'La zona de cobertura contiene una provincia no válida.' })
    expect(h.state.events).toEqual([])
  })

  it('guardarPerfilProveedor normaliza campos opcionales y reemplaza las zonas', async () => {
    const result = await guardarPerfilProveedor({ success: true }, perfilForm({
      nombre_empresa: ' Promeria ', descripcion: ' Materiales ', direccion: '', ciudad: ' Santiago ', rnc: '',
      telefono: '809-555-0100', whatsapp: '', horario: ' Lun a vie ', sitio_web: 'https://promeria.example',
      logo_url: 'https://storage.example/logos/prov-1/logo.png',
    }, ['Santiago', 'Santiago', 'La Vega']))

    expect(result).toEqual({ success: true })
    expect(h.state.events).toEqual([
      {
        table: 'proveedores', operation: 'update',
        value: {
          nombre_empresa: 'Promeria', descripcion: 'Materiales', direccion: null, ciudad: 'Santiago', rnc: null,
          telefono: '809-555-0100', whatsapp: null, horario: 'Lun a vie', sitio_web: 'https://promeria.example',
          logo_url: 'https://storage.example/logos/prov-1/logo.png',
        },
        filters: [['id', 'prov-1'], ['user_id', 'user-1']],
      },
      { table: 'proveedor_zonas', operation: 'delete', filters: [['proveedor_id', 'prov-1']] },
      {
        table: 'proveedor_zonas', operation: 'insert',
        value: [
          { proveedor_id: 'prov-1', provincia: 'Santiago' },
          { proveedor_id: 'prov-1', provincia: 'La Vega' },
        ],
        filters: [],
      },
    ])
    expect(h.revalidatePath.mock.calls).toEqual([
      ['/proveedor'], ['/proveedor/perfil'], ['/proveedores'], ['/proveedores/prov-1'],
    ])
  })

  it('guardarPerfilProveedor devuelve el error de Supabase', async () => {
    h.state.updateError = { message: 'falló actualización' }

    const result = await guardarPerfilProveedor({ success: true }, perfilForm({ nombre_empresa: 'Promeria' }))

    expect(result).toEqual({ error: 'falló actualización' })
    expect(h.state.events).toHaveLength(1)
    expect(h.state.events[0].operation).toBe('update')
  })
})
