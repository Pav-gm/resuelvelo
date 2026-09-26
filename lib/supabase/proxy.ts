import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_DISPONIBLE =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://<project-ref>.supabase.co'

function coincidePrefijo(pathname: string, prefijo: string) {
  return pathname === prefijo || pathname.startsWith(`${prefijo}/`)
}

function rutaProtegida(pathname: string) {
  return (
    coincidePrefijo(pathname, '/admin') ||
    coincidePrefijo(pathname, '/proveedor') ||
    coincidePrefijo(pathname, '/mis-cotizaciones')
  )
}

type CookieToSet = {
  name: string
  value: string
  options?: Parameters<NextResponse['cookies']['set']>[2]
}

function redirigirConCookies(
  request: NextRequest,
  cookiesToSet: CookieToSet[],
  destino: '/login' | '/catalogo'
) {
  const redirectResponse = NextResponse.redirect(new URL(destino, request.url))
  cookiesToSet.forEach(({ name, value, options }) =>
    redirectResponse.cookies.set(name, value, options)
  )
  return redirectResponse
}

export async function updateSession(request: NextRequest) {
  if (!SUPABASE_DISPONIBLE) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })
  let cookiesRefrescadas: CookieToSet[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesRefrescadas = cookiesToSet
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (!rutaProtegida(pathname)) {
    return supabaseResponse
  }

  if (!user) {
    return redirigirConCookies(request, cookiesRefrescadas, '/login')
  }

  if (coincidePrefijo(pathname, '/mis-cotizaciones')) {
    return supabaseResponse
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()

  const rol = error || !profile?.rol ? null : profile.rol

  if (coincidePrefijo(pathname, '/admin') && rol !== 'admin') {
    return redirigirConCookies(request, cookiesRefrescadas, '/catalogo')
  }

  if (coincidePrefijo(pathname, '/proveedor') && rol !== 'proveedor') {
    return redirigirConCookies(request, cookiesRefrescadas, '/catalogo')
  }

  return supabaseResponse
}
