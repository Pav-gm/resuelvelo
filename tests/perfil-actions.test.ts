import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockQuery = {
  select(columns?: string): MockQuery
  maybeSingle(): Promise<{ data: { rol?: string; id?: string } | null; error: unknown }>
  limit(count: number): MockQuery
  update(value: unknown): MockQuery
  insert(value: unknown): Promise<{ error: unknown }>
  delete(): MockQuery
  then(
    resolve: (value: { error: unknown }) => unknown,
    reject?: (reason: unknown) => unknown
  ): Promise<unknown>
  eq(column: string, value: unknown): MockQuery
}

const h = vi.hoisted(() => {
  const state = {
    user: null as { id: string } | null,
    rol: null as string | null,
    cotizacion: null as { id: string } | null,
    cotizacionReadError: null as unknown,
    deleteError: null as unknown,
    writes: [] as Array<{ table: string; operation: string; value?: unknown }>,
    operations: [] as Array<{ table: string; operation: string; value?: unknown }>,
    filters: [] as Array<{ table: string; column: string; value: unknown }>,
    readFilters: [] as Array<{ table: string; column: string; value: unknown }>,
  }

  const createClient = vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from(table: string) {
      let operation = 'read'
      const query: MockQuery = {
        select(columns?: string) {
          state.operations.push({ table, operation: 'select', value: columns })
          return query
        },
        maybeSingle: async () => table === 'cotizaciones'
          ? { data: state.cotizacion, error: state.cotizacionReadError }
          : { data: state.rol ? { rol: state.rol } : null, error: null },
        limit(count: number) {
          state.operations.push({ table, operation: 'limit', value: count })
          return query
        },
        update(value: unknown) {
          operation = 'update'
          state.writes.push({ table, operation: 'update', value })
          state.operations.push({ table, operation: 'update', value })
          return query
        },
        insert(value: unknown) {
          state.operations.push({ table, operation: 'insert', value })
          state.writes.push({ table, operation: 'insert', value })
          return Promise.resolve({ error: null })
        },
        delete() {
          operation = 'delete'
          state.writes.push({ table, operation: 'delete' })
          state.operations.push({ table, operation: 'delete' })
          return query
        },
        then(resolve: (value: { error: unknown }) => unknown, reject?: (reason: unknown) => unknown) {
          return Promise.resolve({ error: table === 'direcciones_obra' && operation === 'delete' ? state.deleteError : null }).then(resolve, reject)
        },
        eq(column: string, value: unknown) {
          const filter = { table, column, value }
          state.operations.push({ table, operation: 'eq', value: filter })
          if ((table === 'profiles' || table === 'cotizaciones') && operation === 'read') {
            state.readFilters.push(filter)
          } else {
            state.filters.push(filter)
          }
          return query
        },
      }
      return query
    },
  }))

  return { state, createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  actualizarDireccionObra,
  crearDireccionObra,
  eliminarDireccionObra,
  guardarPerfil,
} from '@/app/(marketplace)/perfil/actions'
import { esTelefonoDoValido, normalizarTelefonoDo } from '@/lib/validaciones-perfil'

beforeEach(() => {
  h.state.user = { id: 'u-1' }
  h.state.rol = 'comprador'
  h.state.cotizacion = null
  h.state.cotizacionReadError = null
  h.state.deleteError = null
  h.state.writes.length = 0
  h.state.operations.length = 0
  h.state.filters.length = 0
  h.state.readFilters.length = 0
  h.createClient.mockClear()
})

describe('acciones de perfil del comprador', () => {
  it('esTelefonoDoValido acepta teléfonos dominicanos formateados y vacíos', () => {
    expect(esTelefonoDoValido('809-555-1234')).toBe(true)
    expect(esTelefonoDoValido('+1 (829) 555 1234')).toBe(true)
    expect(esTelefonoDoValido('')).toBe(true)
    expect(normalizarTelefonoDo('809-555-1234')).toBe('8095551234')
    expect(normalizarTelefonoDo('+1 (829) 555 1234')).toBe('8295551234')
    expect(normalizarTelefonoDo('')).toBe('')
  })

  it('esTelefonoDoValido rechaza entradas que no son teléfonos dominicanos válidos', () => {
    for (const telefono of ['abc', '123', '1235551234', '80955512345']) {
      expect(esTelefonoDoValido(telefono)).toBe(false)
    }
  })

  it('guardarPerfil guarda teléfonos dominicanos formateados normalizados', async () => {
    const primera = await guardarPerfil({
      nombre: 'Ana Pérez', razon_social: '', rnc: '123456789', telefono: '809-555-1234',
    })
    const segundo = await guardarPerfil({
      nombre: 'Ana Pérez', razon_social: '', rnc: '123456789', telefono: '+1 (829) 555 1234',
    })

    expect(primera).toEqual({ error: null, success: true })
    expect(segundo).toEqual({ error: null, success: true })
    expect(h.state.writes.map((write) => (write.value as { telefono: string | null }).telefono)).toEqual([
      '8095551234', '8295551234',
    ])
  })

  it('guardarPerfil rechaza teléfonos inválidos sin escribir en Supabase', async () => {
    for (const telefono of ['abc', '123']) {
      const result = await guardarPerfil({
        nombre: 'Ana Pérez', razon_social: '', rnc: '123456789', telefono,
      })

      expect(result).toEqual({
        error: 'El teléfono debe ser un número dominicano válido de 10 dígitos.',
        success: false,
      })
    }
    expect(h.state.writes).toEqual([])
  })

  it('guardarPerfil actualiza los datos normalizados del comprador autenticado', async () => {
    const result = await guardarPerfil({
      nombre: ' Ana Pérez ',
      razon_social: ' Obras Pérez ',
      rnc: '123456789',
      telefono: ' 8095550101 ',
    })

    expect(result).toEqual({ error: null, success: true })
    expect(h.state.writes).toEqual([{
      table: 'profiles',
      operation: 'update',
      value: { nombre: 'Ana Pérez', razon_social: 'Obras Pérez', rnc: '123456789', telefono: '8095550101' },
    }])
    expect(h.state.filters).toEqual([{ table: 'profiles', column: 'id', value: 'u-1' }])
  })

  it('guardarPerfil rechaza un RNC inválido sin escribir en Supabase', async () => {
    const result = await guardarPerfil({
      nombre: 'Ana Pérez', razon_social: '', rnc: '1234567890', telefono: '',
    })

    expect(result).toEqual({ error: 'El RNC debe tener 9 u 11 dígitos numéricos.', success: false })
    expect(h.state.writes).toEqual([])
  })

  it('crearDireccionObra asocia la dirección al comprador autenticado', async () => {
    const result = await crearDireccionObra({
      etiqueta: 'Obra Centro', direccion: 'Calle 1 #2', provincia: 'Santiago',
      municipio: 'Santiago de los Caballeros', referencia: '', es_principal: false,
    })

    expect(result).toEqual({ error: null, success: true })
    expect(h.state.writes).toEqual([{
      table: 'direcciones_obra',
      operation: 'insert',
      value: {
        etiqueta: 'Obra Centro', direccion: 'Calle 1 #2', provincia: 'Santiago',
        municipio: 'Santiago de los Caballeros', referencia: null, es_principal: false, user_id: 'u-1',
      },
    }])
  })

  it('actualizarDireccionObra limita la edición a la dirección del comprador', async () => {
    const result = await actualizarDireccionObra('dir-1', {
      etiqueta: 'Obra Norte', direccion: 'Av. 2', provincia: 'Puerto Plata',
      municipio: '', referencia: 'Portón azul', es_principal: true,
    })

    expect(result).toEqual({ error: null, success: true })
    expect(h.state.writes).toEqual([{
      table: 'direcciones_obra',
      operation: 'update',
      value: {
        etiqueta: 'Obra Norte', direccion: 'Av. 2', provincia: 'Puerto Plata',
        municipio: null, referencia: 'Portón azul', es_principal: true,
      },
    }])
    expect(h.state.filters).toEqual([
      { table: 'direcciones_obra', column: 'id', value: 'dir-1' },
      { table: 'direcciones_obra', column: 'user_id', value: 'u-1' },
    ])
  })

  it('eliminarDireccionObra borra una dirección sin cotizaciones', async () => {
    const result = await eliminarDireccionObra('dir-1')

    expect(result).toEqual({ error: null, success: true })
    expect(h.state.writes).toEqual([{ table: 'direcciones_obra', operation: 'delete' }])
    expect(h.state.filters).toEqual([
      { table: 'direcciones_obra', column: 'id', value: 'dir-1' },
      { table: 'direcciones_obra', column: 'user_id', value: 'u-1' },
    ])
  })

  it('eliminarDireccionObra rechaza una dirección usada por una cotización sin borrarla', async () => {
    h.state.cotizacion = { id: 'cot-1' }

    const result = await eliminarDireccionObra('dir-1')

    expect(result).toEqual({
      error: 'Esta dirección se usó en una cotización y no se puede quitar.',
      success: false,
    })
    expect(h.state.writes).toEqual([])
    expect(h.state.operations).toContainEqual({ table: 'cotizaciones', operation: 'eq', value: {
      table: 'cotizaciones', column: 'direccion_obra_id', value: 'dir-1',
    } })
  })

  it('eliminarDireccionObra informa uso en cotización si la clave foránea falla por carrera', async () => {
    h.state.deleteError = { code: '23503' }

    const result = await eliminarDireccionObra('dir-1')

    expect(result).toEqual({
      error: 'Esta dirección se usó en una cotización y no se puede quitar.',
      success: false,
    })
  })

  it('las acciones del perfil rechazan usuarios sin sesión o con otro rol', async () => {
    h.state.user = null
    const sinSesion = await eliminarDireccionObra('dir-1')

    h.state.user = { id: 'u-2' }
    h.state.rol = 'proveedor'
    const otroRol = await crearDireccionObra({
      etiqueta: 'A', direccion: 'B', provincia: 'C', municipio: '', referencia: '', es_principal: false,
    })

    expect(sinSesion).toEqual({ error: 'No autorizado.', success: false })
    expect(otroRol).toEqual({ error: 'No autorizado.', success: false })
    expect(h.state.writes).toEqual([])
  })
})
