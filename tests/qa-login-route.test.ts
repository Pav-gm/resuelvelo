import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const signOut = vi.fn(async () => ({ error: null }))
  const signInWithPassword = vi.fn(async (): Promise<{ error: { message: string } | null }> => ({ error: null }))
  const createClient = vi.fn(async () => ({ auth: { signOut, signInWithPassword } }))

  return { signOut, signInWithPassword, createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))

import { GET } from '@/app/api/qa-login/route'

const TOKEN = 'qa-token-0123456789-abcdefghijklmnop'

function solicitud(rol: string, token: string, ip: string): Request {
  return new Request(`https://preview.example/api/qa-login?rol=${rol}&t=${token}`, {
    headers: { 'x-forwarded-for': ip },
  })
}

async function expectRespuestaVacia(response: Response, status: number) {
  expect(response.status).toBe(status)
  expect(await response.text()).toBe('')
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const key of [
    'VERCEL_ENV',
    'QA_LOGIN_TOKEN',
    'QA_COMPRADOR_EMAIL',
    'QA_COMPRADOR_PASSWORD',
    'QA_PROVEEDOR_EMAIL',
    'QA_PROVEEDOR_PASSWORD',
  ]) {
    delete process.env[key]
  }
  process.env.VERCEL_ENV = 'preview'
  mocks.signOut.mockResolvedValue({ error: null })
  mocks.signInWithPassword.mockResolvedValue({ error: null })
  mocks.createClient.mockResolvedValue({ auth: { signOut: mocks.signOut, signInWithPassword: mocks.signInWithPassword } })
})

describe('GET /api/qa-login', () => {
  it('GET /api/qa-login devuelve 404 vacío si falta QA_LOGIN_TOKEN', async () => {
    const response = await GET(solicitud('comprador', TOKEN, '198.51.100.1'))

    await expectRespuestaVacia(response, 404)
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
  })

  it('GET /api/qa-login devuelve 404 vacío en Production aunque el token sea correcto', async () => {
    process.env.VERCEL_ENV = 'production'
    process.env.QA_LOGIN_TOKEN = TOKEN

    const response = await GET(solicitud('comprador', TOKEN, '198.51.100.2'))

    await expectRespuestaVacia(response, 404)
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
  })

  it('GET /api/qa-login devuelve 404 vacío con token incorrecto o rol inválido', async () => {
    process.env.QA_LOGIN_TOKEN = TOKEN
    process.env.QA_COMPRADOR_EMAIL = 'buyer.qa@example.test'
    process.env.QA_COMPRADOR_PASSWORD = 'buyer-pass-secret'

    const respuestas = await Promise.all([
      GET(solicitud('comprador', 'token-equivocado', '198.51.100.7')),
      GET(solicitud('admin', TOKEN, '198.51.100.8')),
    ])

    for (const response of respuestas) await expectRespuestaVacia(response, 404)
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
  })

  it('GET /api/qa-login inicia sesión como comprador y redirige a /catalogo sin filtrar secretos', async () => {
    process.env.QA_LOGIN_TOKEN = TOKEN
    process.env.QA_COMPRADOR_EMAIL = 'buyer.qa@example.test'
    process.env.QA_COMPRADOR_PASSWORD = 'buyer-pass-secret'

    const response = await GET(solicitud('comprador', TOKEN, '198.51.100.3'))

    expect(mocks.signOut).toHaveBeenCalledTimes(1)
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'buyer.qa@example.test', password: 'buyer-pass-secret' })
    expect(response.status).toBe(302)
    expect(await response.text()).toBe('')
    expect(response.headers.get('location')).toBe('https://preview.example/catalogo')
    const respuestaCompleta = `${await response.clone().text()} ${Array.from(response.headers).flat().join(' ')}`
    expect(respuestaCompleta).not.toContain(TOKEN)
    expect(respuestaCompleta).not.toContain('buyer-pass-secret')
  })

  it('GET /api/qa-login inicia sesión como proveedor y redirige a /proveedor sin filtrar secretos', async () => {
    process.env.QA_LOGIN_TOKEN = TOKEN
    process.env.QA_PROVEEDOR_EMAIL = 'seller.qa@example.test'
    process.env.QA_PROVEEDOR_PASSWORD = 'seller-pass-secret'

    const response = await GET(solicitud('proveedor', TOKEN, '198.51.100.4'))

    expect(mocks.signOut).toHaveBeenCalledTimes(1)
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'seller.qa@example.test', password: 'seller-pass-secret' })
    expect(response.status).toBe(302)
    expect(await response.text()).toBe('')
    expect(response.headers.get('location')).toBe('https://preview.example/proveedor')
    const respuestaCompleta = `${await response.clone().text()} ${Array.from(response.headers).flat().join(' ')}`
    expect(respuestaCompleta).not.toContain(TOKEN)
    expect(respuestaCompleta).not.toContain('seller-pass-secret')
  })

  it('GET /api/qa-login devuelve 404 vacío cuando falla el inicio de sesión', async () => {
    process.env.QA_LOGIN_TOKEN = TOKEN
    process.env.QA_COMPRADOR_EMAIL = 'buyer.qa@example.test'
    process.env.QA_COMPRADOR_PASSWORD = 'buyer-pass-secret'
    mocks.signInWithPassword.mockResolvedValue({ error: { message: 'invalid credentials' } })

    const response = await GET(solicitud('comprador', TOKEN, '198.51.100.5'))

    expect(mocks.signOut).toHaveBeenCalledTimes(1)
    expect(mocks.signInWithPassword).toHaveBeenCalledTimes(1)
    await expectRespuestaVacia(response, 404)
    expect(response.headers.has('location')).toBe(false)
  })

  it('GET /api/qa-login responde 429 vacío en la undécima petición de una IP durante un minuto', async () => {
    process.env.QA_LOGIN_TOKEN = TOKEN
    const respuestas: Response[] = []

    for (let intento = 0; intento < 11; intento += 1) {
      respuestas.push(await GET(solicitud('comprador', 'token-equivocado', '198.51.100.6')))
    }

    for (const response of respuestas.slice(0, 10)) await expectRespuestaVacia(response, 404)
    await expectRespuestaVacia(respuestas[10], 429)
    expect(mocks.signOut).not.toHaveBeenCalled()
  })
})
