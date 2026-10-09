'use client'

import Link from 'next/link'
import { User, Menu, X, LogOut, LayoutDashboard, Bell } from 'lucide-react'
import Logo from '@/components/layout/Logo'
import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { cerrarSesion } from '@/app/(auth)/actions'
import CarritoDrawer from '@/components/marketplace/CarritoDrawer'
import {
  marcarTodasLasNotificacionesLeidas,
  obtenerNotificaciones,
} from '@/app/(marketplace)/notificaciones/actions'
import { NotificacionLink } from '@/components/marketplace/NotificacionLink'
import { formatearFechaNotificacion } from '@/lib/notificaciones'
import type { Notificacion } from '@/types'

/**
 * Campana de avisos: contador de no leídas que se refresca al montar, al
 * navegar (pathname) y al abrir el panel, y panel con los diez avisos más
 * recientes. Solo se monta para usuarios con sesión.
 */
function CampanaNotificaciones() {
  const pathname = usePathname()
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null)
  const abierto = abiertoEn === pathname
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    const resultado = await obtenerNotificaciones(10)
    setNotificaciones(resultado.data)
    setNoLeidas(resultado.noLeidas)
    setError(resultado.error)
    setCargando(false)
  }, [])

  // Contador al montar y en cada cambio de ruta. Se resuelve de forma asíncrona
  // para no llamar a setState de manera síncrona dentro del efecto.
  useEffect(() => {
    let cancelado = false
    void (async () => {
      const resultado = await obtenerNotificaciones(10)
      if (cancelado) return
      setNotificaciones(resultado.data)
      setNoLeidas(resultado.noLeidas)
      setError(resultado.error)
    })()
    return () => {
      cancelado = true
    }
  }, [pathname])

  async function abrir() {
    setAbiertoEn(pathname)
    await cargar()
  }

  async function marcarTodas() {
    const resultado = await marcarTodasLasNotificacionesLeidas()
    if (resultado.error) {
      setError(resultado.error)
      return
    }
    setNoLeidas(0)
    const ahora = new Date().toISOString()
    setNotificaciones((previas) =>
      previas.map((n) => (n.leida_at ? n : { ...n, leida_at: ahora }))
    )
  }

  function marcarUnaComoLeida(id: string) {
    const ahora = new Date().toISOString()
    setNotificaciones((previas) =>
      previas.map((n) => (n.id === id ? { ...n, leida_at: ahora } : n))
    )
    setNoLeidas((previas) => Math.max(0, previas - 1))
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={abrir}
        className="relative"
        aria-label="Notificaciones"
        data-no-leidas={noLeidas}
      >
        <Bell className="h-5 w-5 text-gray-700" />
        {noLeidas > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
            {noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Notificaciones</h2>
            <button
              type="button"
              onClick={() => setAbiertoEn(null)}
              aria-label="Cerrar"
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {cargando ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Cargando…</p>
            ) : error ? (
              <p className="px-4 py-6 text-center text-sm text-red-600">{error}</p>
            ) : notificaciones.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                No tienes notificaciones.
              </p>
            ) : (
              <ul>
                {notificaciones.map((n) => (
                  <li
                    key={n.id}
                    data-testid="notificacion"
                    data-leida={n.leida_at ? 'true' : 'false'}
                    className="border-b px-4 py-3 last:border-b-0"
                  >
                    <div className="flex items-start gap-2">
                      {!n.leida_at && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        {n.cotizacion_id ? (
                          <NotificacionLink
                            id={n.id}
                            leida={Boolean(n.leida_at)}
                            href={`/cotizaciones/${n.cotizacion_id}`}
                            className="block text-sm font-medium text-gray-900 hover:underline"
                            onMarkedRead={marcarUnaComoLeida}
                          >
                            {n.titulo}
                          </NotificacionLink>
                        ) : (
                          <p className="text-sm font-medium text-gray-900">{n.titulo}</p>
                        )}
                        <p className="mt-0.5 text-xs text-gray-600">{n.cuerpo}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          <span>{formatearFechaNotificacion(n.created_at)}</span>
                          {!n.cotizacion_id && <span>Sin cotización asociada</span>}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
            <Link
              href="/notificaciones"
              className="text-sm font-medium text-orange-500 hover:underline"
              onClick={() => setAbiertoEn(null)}
            >
              Ver todas
            </Link>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={marcarTodas}
              className="text-gray-500"
            >
              Marcar todas como leídas
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface NavbarClientProps {
  usuario: { nombre: string; rol: string } | null
}

export default function NavbarClient({ usuario }: NavbarClientProps) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const panelHref =
    usuario?.rol === 'admin'
      ? '/admin'
      : usuario?.rol === 'proveedor'
        ? '/proveedor'
        : '/mis-cotizaciones'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={36} />
          <span className="text-xl font-bold text-gray-900">
            Resuél<span className="text-orange-500">velo</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/catalogo" className="text-gray-600 hover:text-orange-500 transition-colors">
            Catálogo
          </Link>
          <Link href="/proveedores" className="text-gray-600 hover:text-orange-500 transition-colors">
            Proveedores
          </Link>
          <Link href="/como-funciona" className="text-gray-600 hover:text-orange-500 transition-colors">
            ¿Cómo funciona?
          </Link>
          {usuario?.rol === 'admin' && (
            <Link href="/admin" className="text-gray-600 hover:text-orange-500 transition-colors">
              Administración
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {/* Carrito siempre visible, también en móvil, junto al menú hamburguesa. */}
          <CarritoDrawer />
          {/* Campana de avisos: también visible en móvil para usuarios con sesión. */}
          {usuario && <CampanaNotificaciones />}
          {/* Nombre y acciones de cuenta: solo desde el breakpoint md. */}
          <div className="hidden items-center gap-3 md:flex">
            {usuario ? (
              <>
                <Link href={panelHref}>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <LayoutDashboard className="h-4 w-4" />
                    {usuario.nombre}
                  </Button>
                </Link>
                <form action={cerrarSesion}>
                  <Button variant="outline" size="sm" type="submit" className="gap-1.5">
                    <LogOut className="h-4 w-4" />
                    Salir
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    <User className="mr-1.5 h-4 w-4" />
                    Ingresar
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                    Registrarse
                  </Button>
                </Link>
              </>
            )}
          </div>
          <button
            className="md:hidden"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label="Menú"
          >
            {menuAbierto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className={cn('md:hidden border-t bg-white', menuAbierto ? 'block' : 'hidden')}>
        <nav className="flex flex-col gap-1 px-4 py-3 text-sm font-medium">
          <Link href="/catalogo" className="py-2 text-gray-700 hover:text-orange-500" onClick={() => setMenuAbierto(false)}>
            Catálogo
          </Link>
          <Link href="/proveedores" className="py-2 text-gray-700 hover:text-orange-500" onClick={() => setMenuAbierto(false)}>
            Proveedores
          </Link>
          <Link href="/como-funciona" className="py-2 text-gray-700 hover:text-orange-500" onClick={() => setMenuAbierto(false)}>
            ¿Cómo funciona?
          </Link>
          {usuario?.rol === 'admin' && (
            <Link href="/admin" className="py-2 text-gray-700 hover:text-orange-500" onClick={() => setMenuAbierto(false)}>
              Administración
            </Link>
          )}
          <div className="mt-2 flex gap-2 pb-2">
            {usuario ? (
              <>
                <Link href={panelHref} className="flex-1" onClick={() => setMenuAbierto(false)}>
                  <Button variant="outline" size="sm" className="w-full">{usuario.nombre}</Button>
                </Link>
                <form action={cerrarSesion} className="flex-1">
                  <Button variant="outline" size="sm" type="submit" className="w-full">Salir</Button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="flex-1" onClick={() => setMenuAbierto(false)}>
                  <Button variant="outline" size="sm" className="w-full">Ingresar</Button>
                </Link>
                <Link href="/register" className="flex-1" onClick={() => setMenuAbierto(false)}>
                  <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white">Registrarse</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
