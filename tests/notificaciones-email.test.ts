import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = { data: null as unknown, error: null as { message: string } | null }
  const rpc = vi.fn(async () => ({ data: state.data, error: state.error }))
  const createClient = vi.fn(async () => ({ rpc }))
  const enviarEmail = vi.fn(async (_input: { to: string; subject: string; html: string }) => undefined)
  return { state, rpc, createClient, enviarEmail }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('@/lib/email', () => ({ enviarEmail: h.enviarEmail }))

import { enviarNotificacionCotizacionEmail, type TipoNotificacionEmail } from '@/lib/notificaciones-email'

const TIPOS: { tipo: TipoNotificacionEmail; evento: string }[] = [
  { tipo: 'nueva_solicitud', evento: 'nueva solicitud de cotización' },
  { tipo: 'cotizacion_respondida', evento: 'respondió a tu solicitud con una oferta' },
  { tipo: 'cotizacion_aceptada', evento: 'fue aceptada' },
  { tipo: 'cotizacion_rechazada', evento: 'fue rechazada' },
  { tipo: 'cotizacion_despachada', evento: 'fue despachado' },
  { tipo: 'cotizacion_recibida', evento: 'confirmó la recepción' },
  { tipo: 'cotizacion_cancelada', evento: 'fue cancelada' },
]

beforeEach(() => {
  h.state.data = [{
    destinatario_email: 'destino@example.com',
    contraparte_nombre: 'Ferretería <Norte>',
    numero: 42,
    total_estimado: 1250,
  }]
  h.state.error = null
  h.rpc.mockClear()
  h.createClient.mockClear()
  h.enviarEmail.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://resuelveloapp.com')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('enviarNotificacionCotizacionEmail', () => {
  it('genera asunto y contenido en español para cada tipo', async () => {
    for (const { tipo, evento } of TIPOS) {
      h.enviarEmail.mockClear()
      await enviarNotificacionCotizacionEmail('cot-1', tipo)

      expect(h.rpc).toHaveBeenLastCalledWith('datos_email_notificacion_cotizacion', {
        p_cotizacion_id: 'cot-1',
        p_tipo: tipo,
      })
      expect(h.enviarEmail).toHaveBeenCalledOnce()
      const correo = h.enviarEmail.mock.calls[0][0]
      expect(correo.to).toBe('destino@example.com')
      expect(correo.subject.toLocaleLowerCase('es')).toMatch(/cotización|oferta|pedido|recepción/)
      expect(correo.html).toContain(evento)
      expect(correo.html).toContain('#COT-000042')
      expect(correo.html).toContain('Ferretería &lt;Norte&gt;')
      expect(correo.html).toContain('1250')
      expect(correo.html).toContain('https://resuelveloapp.com/cotizaciones/cot-1')
    }
  })

  it('omite el total cuando la cotización no tiene total estimado', async () => {
    h.state.data = [{
      destinatario_email: 'destino@example.com',
      contraparte_nombre: 'Comprador Uno',
      numero: 7,
      total_estimado: null,
    }]

    await enviarNotificacionCotizacionEmail('cot-2', 'cotizacion_respondida')

    const correo = h.enviarEmail.mock.calls[0][0]
    expect(correo.html).toContain('#COT-000007')
    expect(correo.html).toContain('https://resuelveloapp.com/cotizaciones/cot-2')
    expect(correo.html).not.toMatch(/Total estimado|null|1250|\$|RD\$/)
  })

  it('absorbe errores del RPC y no intenta enviar', async () => {
    h.state.error = { message: 'sin datos' }

    await expect(enviarNotificacionCotizacionEmail('cot-1', 'cotizacion_aceptada')).resolves.toBeUndefined()

    expect(h.enviarEmail).not.toHaveBeenCalled()
  })
})
