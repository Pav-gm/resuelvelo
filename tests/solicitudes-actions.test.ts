import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const rpcResult: { data: unknown; error: { message: string } | null } = {
    data: { solicitud_id: 'sol-1', cotizacion_ids: ['cot-1', 'cot-2'] }, error: null,
  }
  const rpc = vi.fn(async () => rpcResult)
  const maybeSingle = vi.fn(async () => ({ data: { solicitud_id: 'sol-1' }, error: null }))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const createClient = vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    rpc,
    from,
  }))
  const revalidatePath = vi.fn((_ruta: string) => undefined)
  const enviarNotificacionCotizacionEmail = vi.fn(async () => undefined)
  return { rpcResult, rpc, maybeSingle, eq, select, from, createClient, revalidatePath, enviarNotificacionCotizacionEmail }
})

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) } }))
vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('@/lib/notificaciones-email', () => ({ enviarNotificacionCotizacionEmail: h.enviarNotificacionCotizacionEmail }))

import { aceptarOfertaDeSolicitud, crearSolicitudAProveedores } from '@/app/(marketplace)/cotizaciones/actions'
import type { CrearSolicitudInput } from '@/types'

const input: CrearSolicitudInput = {
  titulo: 'Materiales obra',
  notas: 'Entrega en almacén',
  fechaRequerida: '2026-11-15',
  proveedorIds: ['prov-1', 'prov-2'],
  lineas: [{ productoId: null, descripcion: 'Cemento gris', cantidad: 10, unidad: 'sacos' }],
}

beforeEach(() => {
  h.rpcResult.data = { solicitud_id: 'sol-1', cotizacion_ids: ['cot-1', 'cot-2'] }
  h.rpcResult.error = null
  h.rpc.mockClear()
  h.createClient.mockClear()
  h.maybeSingle.mockClear()
  h.eq.mockClear()
  h.select.mockClear()
  h.from.mockClear()
  h.revalidatePath.mockClear()
  h.enviarNotificacionCotizacionEmail.mockClear()
})

describe('acciones de solicitudes multi proveedor', () => {
  it('crearSolicitudAProveedores crea una cotización por proveedor con las mismas líneas y notifica cada una', async () => {
    const resultado = await crearSolicitudAProveedores(input)

    expect(resultado).toEqual({ solicitudId: 'sol-1', cotizacionIds: ['cot-1', 'cot-2'] })
    expect(h.rpc).toHaveBeenCalledWith('crear_solicitud_a_proveedores', {
      p_titulo: 'Materiales obra',
      p_notas: 'Entrega en almacén',
      p_fecha_requerida: '2026-11-15',
      p_proveedor_ids: ['prov-1', 'prov-2'],
      p_lineas: [{ producto_id: null, descripcion: 'Cemento gris', cantidad: 10, unidad: 'sacos' }],
    })
    expect(h.enviarNotificacionCotizacionEmail).toHaveBeenCalledTimes(2)
    expect(h.enviarNotificacionCotizacionEmail).toHaveBeenNthCalledWith(1, 'cot-1', 'nueva_solicitud')
    expect(h.enviarNotificacionCotizacionEmail).toHaveBeenNthCalledWith(2, 'cot-2', 'nueva_solicitud')
  })

  it('crearSolicitudAProveedores rechaza más de cinco proveedores sin llamar al RPC', async () => {
    const resultado = await crearSolicitudAProveedores({
      ...input,
      proveedorIds: ['prov-1', 'prov-2', 'prov-3', 'prov-4', 'prov-5', 'prov-6'],
      lineas: [{ productoId: null, descripcion: 'Cemento', cantidad: 1, unidad: 'saco' }],
    })

    expect(resultado).toEqual({ error: 'Selecciona entre 1 y 5 proveedores.' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.enviarNotificacionCotizacionEmail).not.toHaveBeenCalled()
  })

  it('aceptarOfertaDeSolicitud llama la RPC excluyente y notifica la oferta elegida', async () => {
    h.rpcResult.data = null

    const resultado = await aceptarOfertaDeSolicitud('cot-1')

    expect(resultado).toBeNull()
    expect(h.rpc).toHaveBeenCalledWith('aceptar_oferta_de_solicitud', { p_cotizacion_id: 'cot-1' })
    expect(h.enviarNotificacionCotizacionEmail).toHaveBeenCalledWith('cot-1', 'cotizacion_aceptada')
    expect(h.revalidatePath.mock.calls.map(([ruta]) => ruta)).toEqual([
      '/cotizaciones/cot-1', '/mis-cotizaciones', '/proveedor', '/proveedor/pedidos', '/solicitudes', '/solicitudes/sol-1',
    ])
  })
})
