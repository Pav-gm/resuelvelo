/**
 * Lecturas de feedback con Supabase disponible: columnas públicas,
 * promedio, conteo y propagación de errores de consulta.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    selects: [] as { table: string; columns: string }[],
    filtros: [] as { table: string; column: string; value: unknown }[],
    orden: [] as { table: string; column: string; ascending: boolean }[],
    publico: { data: null as unknown[] | null, error: null as { message: string } | null },
    porCotizacion: { data: null as unknown, error: null as { message: string } | null },
  }

  const createClient = vi.fn(async () => ({
    from(table: string) {
      const api = {
        select(columns: string) {
          state.selects.push({ table, columns })
          return api
        },
        eq(column: string, value: unknown) {
          state.filtros.push({ table, column, value })
          return api
        },
        order(column: string, options?: { ascending: boolean }) {
          state.orden.push({ table, column, ascending: options?.ascending ?? true })
          return Promise.resolve({ data: state.publico.data, error: state.publico.error })
        },
        maybeSingle() {
          return Promise.resolve({
            data: state.porCotizacion.data,
            error: state.porCotizacion.error,
          })
        },
      }
      return api
    },
  }))

  return { state, createClient }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: h.createClient,
}))

import type { ResumenFeedbackProveedor, Feedback } from '@/types'

let getFeedbackDeProveedor!: (proveedorId: string) => Promise<ResumenFeedbackProveedor>
let getFeedbackPorCotizacion!: (cotizacionId: string) => Promise<Feedback | null>

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proyecto.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-test')
  const data = await import('@/lib/data')
  getFeedbackDeProveedor = data.getFeedbackDeProveedor
  getFeedbackPorCotizacion = data.getFeedbackPorCotizacion
})

beforeEach(() => {
  vi.restoreAllMocks()
  h.state.selects.length = 0
  h.state.filtros.length = 0
  h.state.orden.length = 0
  h.state.publico = { data: [], error: null }
  h.state.porCotizacion = { data: null, error: null }
  h.createClient.mockClear()
})

describe('getFeedbackDeProveedor', () => {
  it('pide solo columnas públicas y resume promedio y conteo', async () => {
    h.state.publico.data = [
      reseña(5),
      reseña(4, 'fb-2'),
      reseña(4, 'fb-3'),
    ]

    const resumen = await getFeedbackDeProveedor('prov-1')

    expect(h.state.selects).toEqual([
      {
        table: 'feedback_publico',
        columns: 'id, proveedor_id, calificacion, comentario, created_at, autor_anonimo, respuesta, respuesta_at',
      },
    ])
    expect(h.state.filtros).toEqual([{ table: 'feedback_publico', column: 'proveedor_id', value: 'prov-1' }])
    expect(h.state.orden).toEqual([
      { table: 'feedback_publico', column: 'created_at', ascending: false },
    ])
    expect(resumen.conteo).toBe(3)
    expect(resumen.promedio).toBe(4.33)
    expect(resumen.reseñas).toHaveLength(3)
    expect(resumen.reseñas[0]).toMatchObject({ respuesta: null, respuesta_at: null })
    expect(resumen.reseñas[0]).not.toHaveProperty('comprador_id')
  })

  it('conserva el conteo total y recorta las reseñas recientes a 50', async () => {
    h.state.publico.data = Array.from({ length: 51 }, (_, indice) => reseña(indice % 5 === 0 ? 5 : 4, `fb-${indice}`))

    const resumen = await getFeedbackDeProveedor('prov-1')

    expect(resumen.conteo).toBe(51)
    expect(resumen.reseñas).toHaveLength(50)
  })

  it('si la consulta falla, propaga el error', async () => {
    h.state.publico = { data: null, error: { message: 'relation missing' } }
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getFeedbackDeProveedor('prov-1')).rejects.toEqual({ message: 'relation missing' })
    expect(errorLog).toHaveBeenCalledTimes(1)
  })
})

describe('getFeedbackPorCotizacion', () => {
  it('indica la reseña existente sin pedir la identidad del comprador', async () => {
    h.state.porCotizacion.data = {
      id: 'fb-1',
      cotizacion_id: 'cot-1',
      proveedor_id: 'prov-1',
      calificacion: 5,
      comentario: 'Bien',
      created_at: '2026-03-01T12:00:00.000Z',
    }

    const feedback = await getFeedbackPorCotizacion('cot-1')

    expect(h.state.selects[0]).toEqual({
      table: 'feedback',
      columns: 'id, cotizacion_id, proveedor_id, calificacion, comentario, created_at',
    })
    expect(feedback).toEqual({
      id: 'fb-1',
      cotizacion_id: 'cot-1',
      proveedor_id: 'prov-1',
      calificacion: 5,
      comentario: 'Bien',
      created_at: '2026-03-01T12:00:00.000Z',
      autor_anonimo: 'Comprador verificado',
    })
  })

  it('devuelve null cuando la cotización todavía no tiene reseña', async () => {
    await expect(getFeedbackPorCotizacion('cot-1')).resolves.toBeNull()
  })

  it('si la consulta falla, propaga el error', async () => {
    h.state.porCotizacion = { data: null, error: { message: 'timeout' } }
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getFeedbackPorCotizacion('cot-1')).rejects.toEqual({ message: 'timeout' })
    expect(errorLog).toHaveBeenCalledTimes(1)
  })
})

function reseña(calificacion: number, id = 'fb-1') {
  return {
    id,
    proveedor_id: 'prov-1',
    calificacion,
    comentario: null,
    created_at: '2026-03-01T12:00:00.000Z',
    autor_anonimo: 'Comprador verificado',
    respuesta: null,
    respuesta_at: null,
  }
}
