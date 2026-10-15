import { afterEach, describe, expect, it, vi } from 'vitest'
import { enviarEmail } from '@/lib/email'

describe('enviarEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('envía a Brevo el payload esperado cuando hay clave', async () => {
    vi.stubEnv('BREVO_API_KEY', 'clave-prueba')
    vi.stubEnv('EMAIL_FROM', 'Resuélvelo <notificaciones@resuelveloapp.com>')
    const fetchMock = vi.fn(async () => ({ ok: true, status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(enviarEmail({
      to: 'ana@example.com',
      subject: 'Cotización recibida',
      html: '<p>Hola</p>',
    })).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': 'clave-prueba',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Resuélvelo', email: 'notificaciones@resuelveloapp.com' },
        to: [{ email: 'ana@example.com' }],
        subject: 'Cotización recibida',
        htmlContent: '<p>Hola</p>',
      }),
    })
  })

  it('omite el envío y registra una sola vez cuando falta la clave', async () => {
    vi.stubEnv('BREVO_API_KEY', '')
    vi.stubEnv('EMAIL_FROM', 'Resuélvelo <notificaciones@resuelveloapp.com>')
    const fetchMock = vi.fn()
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', fetchMock)
    const input = { to: 'ana@example.com', subject: 'Aviso', html: '<p>Hola</p>' }

    await expect(enviarEmail(input)).resolves.toBeUndefined()
    await expect(enviarEmail(input)).resolves.toBeUndefined()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(info).toHaveBeenCalledOnce()
  })
})
