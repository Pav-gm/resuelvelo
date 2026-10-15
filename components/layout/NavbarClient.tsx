'use client'

import Link from 'next/link'
import { User, Menu, X, LogOut, Bell } from 'lucide-react'
import Logo from '@/components/layout/Logo'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { cerrarSesion } from '@/app/(auth)/actions'
import CarritoDrawer, { type DireccionObraDrawer } from '@/components/marketplace/CarritoDrawer'
import {
  marcarTodasLasNotificacionesLeidas,
  obtenerNotificaciones,
} from '@/app/(marketplace)/notificaciones/actions'
import { NotificacionLink } from '@/components/marketplace/NotificacionLink'
import { formatearFechaNotificacion } from '@/lib/notificaciones'
import type { Notificacion } from '@/types'

export interface NavbarUser {
  nombre: string
  email: string
  rol: string
}

type AccountMenuItem = { label: string; href: string; unreadCount?: number }
type NavItem = { label: string; href: string }

const ETIQUETA_ROL: Record<string, string> = {
  comprador: 'Comprador',
  proveedor: 'Proveedor',
  admin: 'Administrador',
}

/** Opciones del menú de cuenta por rol, en el orden acordado. */
function menuCuenta(rol: string, noLeidas: number): AccountMenuItem[] {
  if (rol === 'proveedor') {
    return [
      { label: 'Panel', href: '/proveedor' },
      { label: 'Pedidos', href: '/proveedor/pedidos' },
      { label: 'Productos', href: '/proveedor/productos' },
      { label: 'Productos archivados', href: '/proveedor/productos?tab=archivados' },
      { label: 'Nuevo producto', href: '/proveedor/productos/nuevo' },
      { label: 'Notificaciones', href: '/notificaciones', unreadCount: noLeidas },
      { label: 'Perfil de la empresa', href: '/proveedor/perfil' },
    ]
  }

  if (rol === 'admin') {
    return [
      { label: 'Administración', href: '/admin' },
      { label: 'Notificaciones', href: '/notificaciones', unreadCount: noLeidas },
    ]
  }

  return [
    { label: 'Mi cuenta', href: '/cuenta' },
    { label: 'Mis cotizaciones', href: '/mis-cotizaciones' },
    { label: 'Mis solicitudes', href: '/solicitudes' },
    { label: 'Nueva solicitud a varios proveedores', href: '/solicitudes/nueva' },
    { label: 'Notificaciones', href: '/notificaciones', unreadCount: noLeidas },
    { label: 'Mi perfil y direcciones', href: '/perfil' },
  ]
}

/** Accesos principales de escritorio según la sesión. */
function navegacionPrincipal(rol: string | undefined): NavItem[] {
  if (!rol) {
    return [
      { label: 'Catálogo', href: '/catalogo' },
      { label: 'Proveedores', href: '/proveedores' },
      { label: 'Cómo funciona', href: '/como-funciona' },
    ]
  }

  if (rol === 'proveedor') {
    return [
      { label: 'Panel', href: '/proveedor' },
      { label: 'Pedidos', href: '/proveedor/pedidos' },
      { label: 'Productos', href: '/proveedor/productos' },
    ]
  }

  if (rol === 'admin') {
    return [
      { label: 'Catálogo', href: '/catalogo' },
      { label: 'Proveedores', href: '/proveedores' },
      { label: 'Cómo funciona', href: '/como-funciona' },
      { label: 'Administración', href: '/admin' },
    ]
  }

  return [
    { label: 'Catálogo', href: '/catalogo' },
    { label: 'Proveedores', href: '/proveedores' },
    { label: 'Mis cotizaciones', href: '/mis-cotizaciones' },
    { label: 'Mis solicitudes', href: '/solicitudes' },
  ]
}

/** Accesos principales del menú móvil, fuera del grupo de cuenta. */
function accesosMoviles(rol: string | undefined): NavItem[] {
  if (!rol) {
    return [
      { label: 'Catálogo', href: '/catalogo' },
      { label: 'Proveedores', href: '/proveedores' },
      { label: 'Cómo funciona', href: '/como-funciona' },
    ]
  }

  if (rol === 'proveedor') {
    return [{ label: 'Catálogo', href: '/catalogo' }]
  }

  if (rol === 'admin') {
    return [
      { label: 'Catálogo', href: '/catalogo' },
      { label: 'Proveedores', href: '/proveedores' },
      { label: 'Cómo funciona', href: '/como-funciona' },
    ]
  }

  return [
    { label: 'Catálogo', href: '/catalogo' },
    { label: 'Proveedores', href: '/proveedores' },
  ]
}

function ContadorNoLeidas({ cantidad }: { cantidad: number }) {
  return (
    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
      {cantidad}
    </span>
  )
}

interface CampanaProps {
  notificaciones: Notificacion[]
  noLeidas: number
  cargando: boolean
  error: string | null
  cargar: () => Promise<void>
  marcarTodas: () => Promise<void>
  marcarUnaComoLeida: (id: string) => void
}

/**
 * Campana de avisos: contador de no leídas que se refresca al montar, al
 * navegar (pathname) y al abrir el panel, y panel con los diez avisos más
 * recientes. El estado de avisos lo comparte con el menú de cuenta.
 */
function CampanaNotificaciones({
  notificaciones,
  noLeidas,
  cargando,
  error,
  cargar,
  marcarTodas,
  marcarUnaComoLeida,
}: CampanaProps) {
  const pathname = usePathname()
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null)
  const abierto = abiertoEn === pathname

  async function abrir() {
    setAbiertoEn(pathname)
    await cargar()
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

const MENU_CUENTA_ID = 'menu-cuenta'

/**
 * Menú de cuenta de escritorio: botón con estado ARIA y panel con las opciones
 * del rol, la identidad y la acción de cerrar sesión. Navegable con teclado y
 * se cierra con Escape, clic fuera o al elegir una opción.
 */
function MenuCuenta({ usuario, noLeidas }: { usuario: NavbarUser; noLeidas: number }) {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const items = useMemo(() => menuCuenta(usuario.rol, noLeidas), [usuario.rol, noLeidas])

  useEffect(() => {
    if (!abierto) return
    const primero = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')
    primero?.focus()
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    function alClicFuera(evento: MouseEvent) {
      if (contenedorRef.current?.contains(evento.target as Node)) return
      setAbierto(false)
    }
    document.addEventListener('mousedown', alClicFuera)
    return () => document.removeEventListener('mousedown', alClicFuera)
  }, [abierto])

  function enfocarBoton() {
    contenedorRef.current?.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.focus()
  }

  function manejarTeclado(evento: ReactKeyboardEvent<HTMLDivElement>) {
    const elementos = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
    )
    if (elementos.length === 0) return

    const activo = document.activeElement as HTMLElement | null
    const indice = elementos.findIndex((elemento) => elemento === activo)

    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      elementos[(indice + 1 + elementos.length) % elementos.length].focus()
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      elementos[(indice - 1 + elementos.length) % elementos.length].focus()
    } else if (evento.key === 'Home') {
      evento.preventDefault()
      elementos[0].focus()
    } else if (evento.key === 'End') {
      evento.preventDefault()
      elementos[elementos.length - 1].focus()
    } else if (evento.key === 'Escape') {
      evento.preventDefault()
      setAbierto(false)
      enfocarBoton()
    }
  }

  return (
    <div ref={contenedorRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={MENU_CUENTA_ID}
        onClick={() => setAbierto((previo) => !previo)}
      >
        <User className="h-4 w-4" />
        {usuario.nombre}
      </Button>

      {abierto && (
        <div
          ref={menuRef}
          id={MENU_CUENTA_ID}
          role="menu"
          aria-label="Menú de cuenta"
          onKeyDown={manejarTeclado}
          className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-white py-2 shadow-xl"
        >
          <div className="border-b px-4 py-3">
            <p className="truncate text-sm font-semibold text-gray-900">{usuario.nombre}</p>
            <p className="truncate text-xs text-gray-500">{usuario.email}</p>
            <p className="mt-0.5 text-xs font-medium text-orange-500">
              {ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
            </p>
          </div>

          <div className="py-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setAbierto(false)}
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <span>{item.label}</span>
                {item.unreadCount ? <ContadorNoLeidas cantidad={item.unreadCount} /> : null}
              </Link>
            ))}
          </div>

          <div role="separator" className="my-1 border-t" />

          <form action={cerrarSesion}>
            <button
              type="submit"
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export interface NavbarClientProps {
  usuario: NavbarUser | null
  direccionesObra: DireccionObraDrawer[]
}

export default function NavbarClient({ usuario, direccionesObra }: NavbarClientProps) {
  const pathname = usePathname()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [errorNotificaciones, setErrorNotificaciones] = useState<string | null>(null)

  const tieneSesion = Boolean(usuario)

  const cargarNotificaciones = useCallback(async () => {
    setCargando(true)
    setErrorNotificaciones(null)
    const resultado = await obtenerNotificaciones(10)
    setNotificaciones(resultado.data)
    setNoLeidas(resultado.noLeidas)
    setErrorNotificaciones(resultado.error)
    setCargando(false)
  }, [])

  // Contador al montar y en cada cambio de ruta. Se resuelve de forma asíncrona
  // para no llamar a setState de manera síncrona dentro del efecto.
  useEffect(() => {
    if (!tieneSesion) return
    let cancelado = false
    void (async () => {
      const resultado = await obtenerNotificaciones(10)
      if (cancelado) return
      setNotificaciones(resultado.data)
      setNoLeidas(resultado.noLeidas)
      setErrorNotificaciones(resultado.error)
    })()
    return () => {
      cancelado = true
    }
  }, [pathname, tieneSesion])

  async function marcarTodas() {
    const resultado = await marcarTodasLasNotificacionesLeidas()
    if (resultado.error) {
      setErrorNotificaciones(resultado.error)
      return
    }
    setNoLeidas(0)
    const ahora = new Date().toISOString()
    setNotificaciones((previas) =>
      previas.map((n) => (n.leida_at ? n : { ...n, leida_at: ahora }))
    )
  }

  function marcarUnaComoLeida(id: string) {
    // Solo baja el contador si el aviso existe en el estado y sigue sin leerse;
    // así un aviso ya leído o ausente no descuadra el contador.
    const aviso = notificaciones.find((n) => n.id === id)
    if (aviso && !aviso.leida_at) {
      setNoLeidas((previas) => Math.max(0, previas - 1))
    }
    const ahora = new Date().toISOString()
    setNotificaciones((previas) =>
      previas.map((n) => (n.id === id ? { ...n, leida_at: ahora } : n))
    )
  }

  const itemsCuenta = useMemo(
    () => (usuario ? menuCuenta(usuario.rol, noLeidas) : []),
    [usuario, noLeidas]
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={36} />
          <span className="text-xl font-bold text-gray-900">
            Resuél<span className="text-orange-500">velo</span>
          </span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-6 text-sm font-medium md:flex"
        >
          {navegacionPrincipal(usuario?.rol).map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              aria-current={pathname === enlace.href ? 'page' : undefined}
              className="text-gray-600 hover:text-orange-500 transition-colors"
            >
              {enlace.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Carrito siempre visible, también en móvil, junto al menú hamburguesa. */}
          <CarritoDrawer direccionesObra={direccionesObra} />
          {/* Campana de avisos: también visible en móvil para usuarios con sesión. */}
          {usuario && (
            <CampanaNotificaciones
              notificaciones={notificaciones}
              noLeidas={noLeidas}
              cargando={cargando}
              error={errorNotificaciones}
              cargar={cargarNotificaciones}
              marcarTodas={marcarTodas}
              marcarUnaComoLeida={marcarUnaComoLeida}
            />
          )}
          {/* Nombre y acciones de cuenta: solo desde el breakpoint md. */}
          <div className="hidden items-center gap-3 md:flex">
            {usuario ? (
              <MenuCuenta usuario={usuario} noLeidas={noLeidas} />
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  <User className="mr-1.5 h-4 w-4" />
                  Iniciar sesión
                </Button>
              </Link>
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
        <nav
          aria-label="Navegación móvil"
          className="flex flex-col gap-1 px-4 py-3 text-sm font-medium"
        >
          {accesosMoviles(usuario?.rol).map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              aria-current={pathname === enlace.href ? 'page' : undefined}
              className="py-2 text-gray-700 hover:text-orange-500"
              onClick={() => setMenuAbierto(false)}
            >
              {enlace.label}
            </Link>
          ))}

          {usuario ? (
            <>
              <p className="mt-2 px-0 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {usuario.nombre}
              </p>
              {itemsCuenta.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  className="flex items-center justify-between gap-3 py-2 text-gray-700 hover:text-orange-500"
                  onClick={() => setMenuAbierto(false)}
                >
                  <span>{item.label}</span>
                  {item.unreadCount ? <ContadorNoLeidas cantidad={item.unreadCount} /> : null}
                </Link>
              ))}
              <form action={cerrarSesion}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 py-2 text-left text-gray-700 hover:text-orange-500"
                  onClick={() => setMenuAbierto(false)}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="py-2 text-gray-700 hover:text-orange-500"
              onClick={() => setMenuAbierto(false)}
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
