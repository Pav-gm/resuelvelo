import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const rpcResult = { data: null, error: null as { message: string } | null }
  const rpc = vi.fn(async () => rpcResult)
  const createClient = vi.fn(async () => ({ rpc }))
  const revalidatePath = vi.fn((_ruta: string) => undefined)
  const enviarNotificacionCotizacionEmail = vi.fn(async () => undefined)
  return { rpcResult, rpc, createClient, revalidatePath, enviarNotificacionCotizacionEmail }
})

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('@/lib/notificaciones-email', () => ({
  enviarNotificacionCotizacionEmail: h.enviarNotificacionCotizacionEmail,
}))

import {
  aceptarOfertaCotizacion,
  rechazarOfertaCotizacion,
  solicitarNuevaOferta,
} from '@/app/(marketplace)/cotizaciones/actions'
import { aceptarCotizacionConCantidades } from '@/app/(marketplace)/proveedor/actions'

beforeEach(() => {
  h.rpcResult.error = null
  h.rpc.mockClear()
  h.createClient.mockClear()
  h.revalidatePath.mockClear()
  h.enviarNotificacionCotizacionEmail.mockClear()
})

describe('acciones de decisión de oferta del comprador', () => {
  it('aceptarOfertaCotizacion acepta la oferta, notifica y revalida las cuatro vistas', async () => {
    const resultado = await aceptarOfertaCotizacion('cot-1')

    expect(resultado).toBeNull()
    expect(h.rpc).toHaveBeenCalledWith('aceptar_oferta_cotizacion', { p_cotizacion_id: 'cot-1' })
    expect(h.enviarNotificacionCotizacionEmail).toHaveBeenCalledWith('cot-1', 'cotizacion_aceptada')
    expect(h.revalidatePath.mock.calls.map(([ruta]) => ruta)).toEqual([
      '/cotizaciones/cot-1', '/mis-cotizaciones', '/proveedor', '/proveedor/pedidos',
    ])
  })

  it('rechazarOfertaCotizacion recorta el motivo, notifica y revalida', async () => {
    const resultado = await rechazarOfertaCotizacion('cot-1', '  Precio fuera del presupuesto  ')

    expect(resultado).toBeNull()
    expect(h.rpc).toHaveBeenCalledWith('rechazar_oferta_cotizacion', {
      p_cotizacion_id: 'cot-1', p_motivo: 'Precio fuera del presupuesto',
    })
    expect(h.enviarNotificacionCotizacionEmail).toHaveBeenCalledWith('cot-1', 'cotizacion_rechazada')
    expect(h.revalidatePath.mock.calls.map(([ruta]) => ruta)).toEqual([
      '/cotizaciones/cot-1', '/mis-cotizaciones', '/proveedor', '/proveedor/pedidos',
    ])
  })

  it('solicitarNuevaOferta recorta la nota y revalida sin enviar email de decisión', async () => {
    const resultado = await solicitarNuevaOferta('cot-1', '  ¿Puedes revisar el precio?  ')

    expect(resultado).toBeNull()
    expect(h.rpc).toHaveBeenCalledWith('solicitar_nueva_oferta', {
      p_cotizacion_id: 'cot-1', p_nota: '¿Puedes revisar el precio?',
    })
    expect(h.enviarNotificacionCotizacionEmail).not.toHaveBeenCalled()
    expect(h.revalidatePath.mock.calls.map(([ruta]) => ruta)).toEqual([
      '/cotizaciones/cot-1', '/mis-cotizaciones', '/proveedor', '/proveedor/pedidos',
    ])
  })

  it('rechazarOfertaCotizacion y solicitarNuevaOferta rechazan texto vacío o mayor de 500 caracteres', async () => {
    for (const texto of ['', '   ', 'a'.repeat(501)]) {
      expect(await rechazarOfertaCotizacion('cot-1', texto)).toEqual({
        error: 'El motivo debe tener entre 1 y 500 caracteres.',
      })
      expect(await solicitarNuevaOferta('cot-1', texto)).toEqual({
        error: 'El motivo debe tener entre 1 y 500 caracteres.',
      })
    }

    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.enviarNotificacionCotizacionEmail).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('aceptarOfertaCotizacion devuelve el error de la RPC sin notificar ni revalidar', async () => {
    h.rpcResult.error = { message: 'La oferta está vencida.' }

    expect(await aceptarOfertaCotizacion('cot-1')).toEqual({ error: 'La oferta está vencida.' })
    expect(h.enviarNotificacionCotizacionEmail).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('el proveedor no puede aceptar una oferta respondida', async () => {
    expect(await aceptarCotizacionConCantidades('cot-1', [{ itemId: 'item-1', cantidad: 2 }])).toEqual({
      error: 'Solo el comprador puede aceptar una oferta respondida.',
    })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.enviarNotificacionCotizacionEmail).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })
})
