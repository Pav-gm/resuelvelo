import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const rpcResult: { data: number | null; error: { message: string } | null } = { data: 35, error: null }
  const rpc = vi.fn(async () => rpcResult)
  const createClient = vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-prov' } } }) },
    rpc,
  }))
  const revalidatePath = vi.fn((_ruta: string) => undefined)
  const redirect = vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) })
  const enviarNotificacionCotizacionEmail = vi.fn(async () => undefined)
  return { rpcResult, rpc, createClient, revalidatePath, redirect, enviarNotificacionCotizacionEmail }
})

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('next/navigation', () => ({ redirect: h.redirect }))
vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('@/lib/notificaciones-email', () => ({ enviarNotificacionCotizacionEmail: h.enviarNotificacionCotizacionEmail }))

import { ofertarCotizacion, rechazarCotizacionConMotivo } from '@/app/(marketplace)/proveedor/actions'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-08T12:00:00.000Z'))
  h.rpcResult.data = 35
  h.rpcResult.error = null
  h.rpc.mockClear()
  h.createClient.mockClear()
  h.revalidatePath.mockClear()
  h.enviarNotificacionCotizacionEmail.mockClear()
})

afterEach(() => vi.useRealTimers())

describe('acciones de oferta de cotización', () => {
  it('ofertarCotizacion reenvía las líneas y términos al RPC y revalida comprador y proveedor', async () => {
    const resultado = await ofertarCotizacion('cot-1', {
      lineas: [
        { itemId: 'item-1', precioUnitario: 12.5, cantidadOfertada: 2 },
        { itemId: 'item-2', precioUnitario: 5, cantidadOfertada: null },
      ],
      plazoDias: 5,
      validaHasta: '2026-10-20',
      condiciones: 'Entrega en almacén.',
    })

    expect(resultado).toBeNull()
    expect(h.rpc).toHaveBeenCalledTimes(1)
    expect(h.rpc).toHaveBeenCalledWith('responder_cotizacion_con_oferta', {
      p_cotizacion_id: 'cot-1',
      p_lineas: [
        { item_id: 'item-1', precio_ofertado: 12.5, cantidad_ofertada: 2 },
        { item_id: 'item-2', precio_ofertado: 5, cantidad_ofertada: null },
      ],
      p_plazo_dias: 5,
      p_valida_hasta: '2026-10-20',
      p_condiciones: 'Entrega en almacén.',
    })
    expect(h.enviarNotificacionCotizacionEmail).toHaveBeenCalledOnce()
    expect(h.enviarNotificacionCotizacionEmail).toHaveBeenCalledWith('cot-1', 'cotizacion_respondida')
    expect(h.revalidatePath.mock.calls.map(([ruta]) => ruta)).toEqual([
      '/cotizaciones/cot-1',
      '/proveedor',
      '/proveedor/pedidos',
      '/mis-cotizaciones',
    ])
  })

  it('ofertarCotizacion rechaza precios no positivos sin llamar al RPC', async () => {
    const resultado = await ofertarCotizacion('cot-1', {
      lineas: [{ itemId: 'item-1', precioUnitario: 0, cantidadOfertada: null }],
      plazoDias: 5,
      validaHasta: '2026-10-20',
      condiciones: null,
    })

    expect(resultado).toEqual({ error: 'Cada precio ofertado debe ser mayor que 0.' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
    expect(h.enviarNotificacionCotizacionEmail).not.toHaveBeenCalled()
  })

  it('ofertarCotizacion rechaza todas las cantidades en cero sin llamar al RPC', async () => {
    const resultado = await ofertarCotizacion('cot-1', {
      lineas: [{ itemId: 'item-1', precioUnitario: 12, cantidadOfertada: 0 }],
      plazoDias: 5,
      validaHasta: '2026-10-20',
      condiciones: null,
    })

    expect(resultado).toEqual({ error: 'Si no puedes servir nada, rechaza la cotización' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('ofertarCotizacion rechaza cantidad vacía o no numérica sin llamar al RPC', async () => {
    const resultado = await ofertarCotizacion('cot-1', {
      lineas: [{ itemId: 'item-1', precioUnitario: 12, cantidadOfertada: '' as unknown as number }],
      plazoDias: 5,
      validaHasta: '2026-10-20',
      condiciones: null,
    })

    expect(resultado).toEqual({ error: 'Indica cuántas unidades confirmas' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('ofertarCotizacion rechaza precio vacío o no numérico sin llamar al RPC', async () => {
    const resultado = await ofertarCotizacion('cot-1', {
      lineas: [{ itemId: 'item-1', precioUnitario: '' as unknown as number, cantidadOfertada: 1 }],
      plazoDias: 5,
      validaHasta: '2026-10-20',
      condiciones: null,
    })

    expect(resultado).toEqual({ error: 'Indica el precio' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('ofertarCotizacion permite cero en una línea si otra tiene unidades', async () => {
    const resultado = await ofertarCotizacion('cot-1', {
      lineas: [
        { itemId: 'item-1', precioUnitario: 12, cantidadOfertada: 0 },
        { itemId: 'item-2', precioUnitario: 5, cantidadOfertada: 2 },
      ],
      plazoDias: 5,
      validaHasta: '2026-10-20',
      condiciones: null,
    })

    expect(resultado).toBeNull()
    expect(h.rpc).toHaveBeenCalledTimes(1)
    expect(h.rpc).toHaveBeenCalledWith('responder_cotizacion_con_oferta', {
      p_cotizacion_id: 'cot-1',
      p_lineas: [
        { item_id: 'item-1', precio_ofertado: 12, cantidad_ofertada: 0 },
        { item_id: 'item-2', precio_ofertado: 5, cantidad_ofertada: 2 },
      ],
      p_plazo_dias: 5,
      p_valida_hasta: '2026-10-20',
      p_condiciones: null,
    })
    expect(h.revalidatePath.mock.calls.map(([ruta]) => ruta)).toEqual([
      '/cotizaciones/cot-1',
      '/proveedor',
      '/proveedor/pedidos',
      '/mis-cotizaciones',
    ])
  })

  it('ofertarCotizacion rechaza plazo fuera de 0–90 sin llamar al RPC', async () => {
    const resultado = await ofertarCotizacion('cot-1', {
      lineas: [{ itemId: 'item-1', precioUnitario: 12, cantidadOfertada: null }],
      plazoDias: 91,
      validaHasta: '2026-10-20',
      condiciones: null,
    })

    expect(resultado).toEqual({ error: 'El plazo debe estar entre 0 y 90 días.' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
    expect(h.enviarNotificacionCotizacionEmail).not.toHaveBeenCalled()
  })

  it('ofertarCotizacion rechaza fecha de validez no futura sin llamar al RPC', async () => {
    const resultado = await ofertarCotizacion('cot-1', {
      lineas: [{ itemId: 'item-1', precioUnitario: 12, cantidadOfertada: null }],
      plazoDias: 5,
      validaHasta: '2026-10-08',
      condiciones: null,
    })

    expect(resultado).toEqual({ error: 'La fecha de validez debe ser futura.' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
    expect(h.enviarNotificacionCotizacionEmail).not.toHaveBeenCalled()
  })

  it('rechazarCotizacionConMotivo guarda el motivo y revalida las listas', async () => {
    h.rpcResult.data = null
    const resultado = await rechazarCotizacionConMotivo('cot-1', 'No puedo abastecer este producto.')

    expect(resultado).toBeNull()
    expect(h.rpc).toHaveBeenCalledTimes(1)
    expect(h.rpc).toHaveBeenCalledWith('rechazar_cotizacion_con_motivo', {
      p_cotizacion_id: 'cot-1',
      p_motivo: 'No puedo abastecer este producto.',
    })
    expect(h.enviarNotificacionCotizacionEmail).toHaveBeenCalledOnce()
    expect(h.enviarNotificacionCotizacionEmail).toHaveBeenCalledWith('cot-1', 'cotizacion_rechazada')
    expect(h.revalidatePath.mock.calls.map(([ruta]) => ruta)).toEqual([
      '/cotizaciones/cot-1',
      '/proveedor',
      '/proveedor/pedidos',
      '/mis-cotizaciones',
    ])
  })

  it('rechazarCotizacionConMotivo devuelve el error del RPC y no envía correo ni revalida', async () => {
    h.rpcResult.error = { message: 'La cotización ya no está pendiente o no tienes permiso para rechazarla.' }
    const resultado = await rechazarCotizacionConMotivo('cot-1', 'Sin stock')

    expect(resultado).toEqual({ error: 'La cotización ya no está pendiente o no tienes permiso para rechazarla.' })
    expect(h.revalidatePath).not.toHaveBeenCalled()
    expect(h.enviarNotificacionCotizacionEmail).not.toHaveBeenCalled()
  })
})
