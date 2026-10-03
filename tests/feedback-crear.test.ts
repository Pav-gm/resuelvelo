/**
 * Elegibilidad y payload de crearFeedback (C-CREACION, C-ELIGIBILIDAD).
 * La acción rechaza sesión y payload inválidos antes del RPC.
 * Identidad, estado `recibida` y duplicados los resuelve crear_feedback;
 * aquí el doble local aplica esa misma regla y la acción solo reenvía
 * cotizacionId, calificacion y comentario.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const COTIZACION_RECIBIDA = '11111111-1111-4111-8111-111111111111'
const COTIZACION_OTRA = '22222222-2222-4222-8222-222222222222'

const COMPRADOR = 'comprador-1'
const OTRO_COMPRADOR = 'comprador-2'
const PROVEEDOR_USER = 'proveedor-user'

type Estado =
  | 'pendiente'
  | 'respondida'
  | 'aceptada'
  | 'rechazada'
  | 'despachada'
  | 'recibida'
  | 'cancelada'

const h = vi.hoisted(() => {
  class RedirectSignal extends Error {
    url: string
    constructor(url: string) {
      super(`REDIRECT ${url}`)
      this.url = url
    }
  }

  const state = {
    user: { id: 'comprador-1' } as { id: string } | null,
    proveedorId: 'prov-1' as string | null,
    cotizaciones: new Map<string, { compradorId: string; estado: Estado }>(),
    reseñas: new Set<string>(),
    rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
    forzarError: null as string | null,
  }

  function crearFeedbackLocal(args: Record<string, unknown>) {
    if (state.forzarError) {
      return { data: null, error: { message: state.forzarError } }
    }
    const cotizacionId = String(args.p_cotizacion_id)
    const calificacion = args.p_calificacion
    const comentario = args.p_comentario
    if (
      typeof calificacion !== 'number' ||
      !Number.isInteger(calificacion) ||
      calificacion < 1 ||
      calificacion > 5 ||
      (comentario !== null && typeof comentario !== 'string') ||
      (typeof comentario === 'string' && comentario.length > 1000)
    ) {
      return { data: null, error: { message: 'FEEDBACK_VALIDACION' } }
    }

    const cotizacion = state.cotizaciones.get(cotizacionId)
    if (!state.user || !cotizacion || cotizacion.compradorId !== state.user.id || cotizacion.estado !== 'recibida') {
      return { data: null, error: { message: 'FEEDBACK_NO_ELEGIBLE' } }
    }
    if (state.reseñas.has(cotizacionId)) {
      return { data: null, error: { message: 'FEEDBACK_DUPLICADO' } }
    }

    state.reseñas.add(cotizacionId)
    return { data: `fb-${cotizacionId.slice(0, 8)}`, error: null }
  }

  const createClient = vi.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
    },
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return {
                single: async () => {
                  if (table !== 'proveedores' || !state.user || !state.proveedorId) {
                    return { data: null, error: { message: 'no encontrado' } }
                  }
                  return { data: { id: state.proveedorId }, error: null }
                },
              }
            },
          }
        },
      }
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      state.rpcCalls.push({ fn, args: { ...args } })
      if (fn === 'crear_feedback') return crearFeedbackLocal(args)
      if (fn === 'confirmar_recepcion' || fn === 'despachar_cotizacion') {
        const claves = Object.keys(args)
        if (claves.length !== 1 || !('p_cotizacion_id' in args) || 'estado' in args) {
          return { data: null, error: { message: 'payload inesperado' } }
        }
        return { data: null, error: null }
      }
      return { data: null, error: { message: 'rpc desconocido' } }
    },
  }))

  const redirect = vi.fn((url: string) => {
    throw new RedirectSignal(url)
  })
  const revalidatePath = vi.fn()

  return { RedirectSignal, state, createClient, redirect, revalidatePath }
})

vi.mock('next/navigation', () => ({
  redirect: h.redirect,
}))

vi.mock('next/cache', () => ({
  revalidatePath: h.revalidatePath,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: h.createClient,
}))

import { confirmarRecepcion, crearFeedback } from '@/app/(marketplace)/cotizaciones/actions'
import { despacharCotizacion } from '@/app/(marketplace)/proveedor/actions'

const ESTADOS_NO_ELEGIBLES: Estado[] = [
  'pendiente',
  'respondida',
  'aceptada',
  'rechazada',
  'despachada',
  'cancelada',
]

beforeEach(() => {
  h.state.user = { id: COMPRADOR }
  h.state.proveedorId = 'prov-1'
  h.state.cotizaciones.clear()
  h.state.reseñas.clear()
  h.state.rpcCalls.length = 0
  h.state.forzarError = null
  h.state.cotizaciones.set(COTIZACION_RECIBIDA, { compradorId: COMPRADOR, estado: 'recibida' })
  h.createClient.mockClear()
  h.redirect.mockClear()
  h.revalidatePath.mockClear()
})

describe('crearFeedback — comprador propietario', () => {
  it('permite una cotización recibida sin comentario', async () => {
    const resultado = await crearFeedback({
      cotizacionId: COTIZACION_RECIBIDA,
      calificacion: 5,
    })

    expect(resultado).toEqual({ data: { id: 'fb-11111111' } })
    expect(h.state.rpcCalls).toEqual([
      {
        fn: 'crear_feedback',
        args: {
          p_cotizacion_id: COTIZACION_RECIBIDA,
          p_calificacion: 5,
          p_comentario: null,
        },
      },
    ])
    expect(h.revalidatePath).toHaveBeenCalledWith('/mis-cotizaciones')
    expect(h.revalidatePath).toHaveBeenCalledWith('/proveedores')
  })

  it('permite el comentario opcional y lo recorta', async () => {
    const resultado = await crearFeedback({
      cotizacionId: COTIZACION_RECIBIDA,
      calificacion: 4,
      comentario: '  Entrega a tiempo  ',
    })

    expect(resultado).toEqual({ data: { id: 'fb-11111111' } })
    expect(h.state.rpcCalls[0].args.p_comentario).toBe('Entrega a tiempo')
  })

  it('trata un comentario en blanco como ausente', async () => {
    await crearFeedback({
      cotizacionId: COTIZACION_RECIBIDA,
      calificacion: 3,
      comentario: '   ',
    })

    expect(h.state.rpcCalls[0].args.p_comentario).toBeNull()
  })

  it('acepta un comentario de 1000 caracteres', async () => {
    const comentario = 'a'.repeat(1000)
    const resultado = await crearFeedback({
      cotizacionId: COTIZACION_RECIBIDA,
      calificacion: 1,
      comentario,
    })

    expect(resultado).toEqual({ data: { id: 'fb-11111111' } })
    expect(h.state.rpcCalls[0].args.p_comentario).toBe(comentario)
  })

  it('no reenvía comprador_id ni proveedor_id aunque vengan en el payload', async () => {
    await crearFeedback({
      cotizacionId: COTIZACION_RECIBIDA,
      calificacion: 2,
      comentario: 'ok',
      comprador_id: 'atacante',
      proveedor_id: 'atacante',
    } as never)

    expect(Object.keys(h.state.rpcCalls[0].args).sort()).toEqual([
      'p_calificacion',
      'p_comentario',
      'p_cotizacion_id',
    ])
  })
})

describe('crearFeedback — rechazos', () => {
  it('rechaza al usuario anónimo sin llamar al RPC', async () => {
    h.state.user = null

    await expect(
      crearFeedback({ cotizacionId: COTIZACION_RECIBIDA, calificacion: 5 })
    ).resolves.toEqual({ error: 'FEEDBACK_NO_AUTENTICADO' })
    expect(h.state.rpcCalls).toHaveLength(0)
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('rechaza al proveedor de la cotización recibida', async () => {
    h.state.user = { id: PROVEEDOR_USER }

    await expect(
      crearFeedback({ cotizacionId: COTIZACION_RECIBIDA, calificacion: 5, comentario: 'no' })
    ).resolves.toEqual({ error: 'FEEDBACK_NO_ELEGIBLE' })
  })

  it('rechaza a otro comprador', async () => {
    h.state.user = { id: OTRO_COMPRADOR }

    await expect(
      crearFeedback({ cotizacionId: COTIZACION_RECIBIDA, calificacion: 5 })
    ).resolves.toEqual({ error: 'FEEDBACK_NO_ELEGIBLE' })
  })

  it.each(ESTADOS_NO_ELEGIBLES)('rechaza el estado %s', async (estado) => {
    h.state.cotizaciones.set(COTIZACION_OTRA, { compradorId: COMPRADOR, estado })

    await expect(
      crearFeedback({ cotizacionId: COTIZACION_OTRA, calificacion: 5 })
    ).resolves.toEqual({ error: 'FEEDBACK_NO_ELEGIBLE' })
  })

  it('rechaza una cotización inexistente', async () => {
    await expect(
      crearFeedback({
        cotizacionId: '33333333-3333-4333-8333-333333333333',
        calificacion: 5,
      })
    ).resolves.toEqual({ error: 'FEEDBACK_NO_ELEGIBLE' })
  })

  it('rechaza una segunda reseña de la misma cotización', async () => {
    const primera = await crearFeedback({
      cotizacionId: COTIZACION_RECIBIDA,
      calificacion: 5,
      comentario: 'primera',
    })
    const segunda = await crearFeedback({
      cotizacionId: COTIZACION_RECIBIDA,
      calificacion: 4,
    })

    expect(primera).toEqual({ data: { id: 'fb-11111111' } })
    expect(segunda).toEqual({ error: 'FEEDBACK_DUPLICADO' })
    expect(h.state.rpcCalls).toHaveLength(2)
    expect(h.revalidatePath).toHaveBeenCalledTimes(2)
  })

  it.each([0, 6, -1, 1.5, Number.NaN])('rechaza la calificación %s sin llamar al RPC', async (calificacion) => {
    await expect(
      crearFeedback({ cotizacionId: COTIZACION_RECIBIDA, calificacion })
    ).resolves.toEqual({ error: 'FEEDBACK_VALIDACION' })
    expect(h.state.rpcCalls).toHaveLength(0)
  })

  it('rechaza un comentario de más de 1000 caracteres', async () => {
    await expect(
      crearFeedback({
        cotizacionId: COTIZACION_RECIBIDA,
        calificacion: 5,
        comentario: 'a'.repeat(1001),
      })
    ).resolves.toEqual({ error: 'FEEDBACK_VALIDACION' })
    expect(h.state.rpcCalls).toHaveLength(0)
  })

  it('rechaza un id de cotización que no es uuid', async () => {
    await expect(
      crearFeedback({ cotizacionId: 'cot-123', calificacion: 5 })
    ).resolves.toEqual({ error: 'FEEDBACK_VALIDACION' })
    expect(h.state.rpcCalls).toHaveLength(0)
  })

  it('traduce un error desconocido del RPC', async () => {
    h.state.forzarError = 'connection reset'

    await expect(
      crearFeedback({ cotizacionId: COTIZACION_RECIBIDA, calificacion: 5 })
    ).resolves.toEqual({ error: 'FEEDBACK_ERROR' })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })
})

describe('recepción — el cliente no asigna el estado', () => {
  it('confirmarRecepcion solo envía el id al RPC', async () => {
    await confirmarRecepcion(COTIZACION_OTRA)

    expect(h.state.rpcCalls).toEqual([
      { fn: 'confirmar_recepcion', args: { p_cotizacion_id: COTIZACION_OTRA } },
    ])
    expect(h.revalidatePath).toHaveBeenCalledWith('/mis-cotizaciones')
    expect(h.revalidatePath).toHaveBeenCalledWith('/proveedor/pedidos')
  })

  it('confirmarRecepcion redirige al anónimo y no llama al RPC', async () => {
    h.state.user = null

    await expect(confirmarRecepcion(COTIZACION_OTRA)).rejects.toMatchObject({ url: '/login' })
    expect(h.state.rpcCalls).toHaveLength(0)
  })

  it('despacharCotizacion solo envía el id al RPC', async () => {
    await despacharCotizacion(COTIZACION_OTRA)

    expect(h.state.rpcCalls).toEqual([
      { fn: 'despachar_cotizacion', args: { p_cotizacion_id: COTIZACION_OTRA } },
    ])
    expect(h.revalidatePath).toHaveBeenCalledWith('/proveedor/pedidos')
    expect(h.revalidatePath).toHaveBeenCalledWith('/mis-cotizaciones')
  })
})
