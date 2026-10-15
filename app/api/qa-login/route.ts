import { createHash, timingSafeEqual } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'

const VENTANA_MS = 60_000
const MAX_SOLICITUDES = 10

const solicitudesPorIp = new Map<string, { inicio: number; solicitudes: number }>()

function respuestaVacia(status: number): Response {
  return new Response(null, { status })
}

function excedeLimite(ip: string, ahora: number): boolean {
  for (const [ipGuardada, ventana] of solicitudesPorIp) {
    if (ahora - ventana.inicio >= VENTANA_MS) solicitudesPorIp.delete(ipGuardada)
  }

  const ventana = solicitudesPorIp.get(ip)
  if (!ventana) {
    solicitudesPorIp.set(ip, { inicio: ahora, solicitudes: 1 })
    return false
  }

  if (ventana.solicitudes >= MAX_SOLICITUDES) return true

  ventana.solicitudes += 1
  return false
}

export async function GET(request: Request): Promise<Response> {
  const tokenEsperado = process.env.QA_LOGIN_TOKEN
  if (process.env.VERCEL_ENV !== 'preview' || !tokenEsperado || tokenEsperado.length < 32) {
    return respuestaVacia(404)
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (excedeLimite(ip, Date.now())) return respuestaVacia(429)

  const parametros = new URL(request.url).searchParams
  const rol = parametros.get('rol')
  const tokenRecibido = parametros.get('t') ?? ''

  if (rol !== 'comprador' && rol !== 'proveedor') return respuestaVacia(404)

  const email = process.env[rol === 'comprador' ? 'QA_COMPRADOR_EMAIL' : 'QA_PROVEEDOR_EMAIL']
  const password = process.env[rol === 'comprador' ? 'QA_COMPRADOR_PASSWORD' : 'QA_PROVEEDOR_PASSWORD']
  if (!email || !password) return respuestaVacia(404)

  const resumenEsperado = createHash('sha256').update(tokenEsperado).digest()
  const resumenRecibido = createHash('sha256').update(tokenRecibido).digest()
  if (!timingSafeEqual(resumenRecibido, resumenEsperado)) return respuestaVacia(404)

  try {
    const supabase = await createClient()
    const { error: errorAlCerrar } = await supabase.auth.signOut({ scope: 'local' })
    if (errorAlCerrar) return respuestaVacia(404)

    const { error: errorAlIniciar } = await supabase.auth.signInWithPassword({ email, password })
    if (errorAlIniciar) return respuestaVacia(404)

    const destino = rol === 'comprador' ? '/catalogo' : '/proveedor'
    return new Response(null, {
      status: 302,
      headers: { Location: new URL(destino, request.url).toString() },
    })
  } catch {
    return respuestaVacia(404)
  }
}
