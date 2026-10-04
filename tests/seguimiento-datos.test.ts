/**
 * Lecturas de comprador y proveedor: select * conserva despachada_at,
 * cancelada_por y recibida_por. Sin Supabase no se inventan.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Cotizacion } from '@/types'

const h = vi.hoisted(() => {
  const state = {
    rows: [] as Cotizacion[],
    error: null as { message: string } | null,
    selects: [] as { table: string; columns: string }[],
    limits: [] as Array<number | undefined>,
  }

  interface Chain {
    select: (columns: string) => Chain
    eq: () => Chain
    order: () => Chain
    limit: (count?: number) => Chain
    then: (
      onFulfilled?: ((value: { data: Cotizacion[] | null; error: { message: string } | null }) => unknown) | null,
      onRejected?: ((reason: unknown) => unknown) | null,
    ) => Promise<unknown>
  }

  function chain(table: string): Chain {
    const builder: Chain = {
      select(columns) {
        state.selects.push({ table, columns })
        return builder
      },
      eq() {
        return builder
      },
      order() {
        return builder
      },
      limit(count) {
        state.limits.push(count)
        return builder
      },
      then(onFulfilled, onRejected) {
        const value = state.error
          ? { data: null, error: state.error }
          : { data: state.rows, error: null }
        return Promise.resolve(value).then(onFulfilled, onRejected)
      },
    }
    return builder
  }

  const createClient = vi.fn(async () => ({
    from(table: string) {
      return chain(table)
    },
  }))

  return { state, createClient }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: h.createClient,
}))

const FILA: Cotizacion = {
  id: 'cot-segui',
  comprador_id: 'comprador-1',
  proveedor_id: 'prov-1',
  estado: 'despachada',
  created_at: '2026-04-01T12:00:00.000Z',
  despachada_at: '2026-04-02T15:04:00.000Z',
  cancelada_por: null,
  recibida_por: 'comprador',
  items: [],
}

async function cargarDatos(url: string) {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url)
  vi.resetModules()
  h.createClient.mockClear()
  return import('@/lib/data')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('lecturas de seguimiento', () => {
  it('el proveedor recibe los campos de seguimiento y conserva select * con límite', async () => {
    h.state.rows = [FILA]
    h.state.error = null
    h.state.selects = []
    h.state.limits = []

    const { getCotizacionesDeProveedor } = await cargarDatos('https://proyecto.supabase.co')
    const cotizaciones = await getCotizacionesDeProveedor('prov-1')

    expect(cotizaciones).toEqual([FILA])
    expect(h.state.selects).toHaveLength(1)
    expect(h.state.selects[0].table).toBe('cotizaciones')
    expect(h.state.selects[0].columns.trimStart().startsWith('*')).toBe(true)
    expect(h.state.limits).toEqual([20])
    expect(cotizaciones[0].despachada_at).toBe('2026-04-02T15:04:00.000Z')
    expect(cotizaciones[0].cancelada_por).toBeNull()
    expect(cotizaciones[0].recibida_por).toBe('comprador')
  })

  it('el comprador recibe los campos de seguimiento y conserva select *', async () => {
    const fila: Cotizacion = { ...FILA, estado: 'cancelada', cancelada_por: 'proveedor', recibida_por: null }
    h.state.rows = [fila]
    h.state.error = null
    h.state.selects = []
    h.state.limits = []

    const { getCotizacionesDelComprador } = await cargarDatos('https://proyecto.supabase.co')
    const cotizaciones = await getCotizacionesDelComprador('comprador-1')

    expect(cotizaciones).toEqual([fila])
    expect(h.state.selects[0].table).toBe('cotizaciones')
    expect(h.state.selects[0].columns.trimStart().startsWith('*')).toBe(true)
    expect(h.state.limits).toEqual([])
    expect(cotizaciones[0].cancelada_por).toBe('proveedor')
    expect(cotizaciones[0].despachada_at).toBe('2026-04-02T15:04:00.000Z')
  })

  it('un error de lectura no inventa cotizaciones ni datos de seguimiento', async () => {
    h.state.rows = [FILA]
    h.state.error = { message: 'permiso denegado' }
    h.state.selects = []

    const { getCotizacionesDeProveedor, getCotizacionesDelComprador } = await cargarDatos(
      'https://proyecto.supabase.co',
    )

    expect(await getCotizacionesDeProveedor('prov-1')).toEqual([])
    expect(await getCotizacionesDelComprador('comprador-1')).toEqual([])
  })

  it('sin Supabase las dos lecturas devuelven vacío y no consultan', async () => {
    h.state.rows = [FILA]
    h.state.error = null
    h.createClient.mockClear()

    const { getCotizacionesDeProveedor, getCotizacionesDelComprador } = await cargarDatos(
      'https://<project-ref>.supabase.co',
    )

    expect(await getCotizacionesDeProveedor('prov-1')).toEqual([])
    expect(await getCotizacionesDelComprador('comprador-1')).toEqual([])
    expect(h.createClient).not.toHaveBeenCalled()
  })
})
