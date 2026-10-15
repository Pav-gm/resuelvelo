import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Clock, ArrowRight, CheckCircle2, Truck, PackageCheck,
  ClipboardList, Bell, Store, Plus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCotizacionesDelComprador, getSolicitudesDelComprador } from '@/lib/data'
import { obtenerNotificaciones } from '@/app/(marketplace)/notificaciones/actions'

/** Estados de cotización resumidos en la cuenta, en el orden en que se muestran. */
const ESTADOS_COTIZACION = [
  { estado: 'pendiente', label: 'Pendientes', icono: Clock },
  { estado: 'respondida', label: 'Respondidas por revisar', icono: ArrowRight },
  { estado: 'aceptada', label: 'Aceptadas', icono: CheckCircle2 },
  { estado: 'despachada', label: 'Despachadas', icono: Truck },
  { estado: 'recibida', label: 'Recibidas', icono: PackageCheck },
] as const

/** Estados que mantienen abierta la solicitud a varios proveedores. */
const ESTADOS_ABIERTOS = ['pendiente', 'respondida']

export default async function CuentaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, razon_social, rnc, telefono, rol')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.rol === 'proveedor') redirect('/proveedor')
  if (!perfil || perfil.rol !== 'comprador') redirect('/catalogo')

  const [cotizaciones, solicitudes, notificaciones, direccionesRes] = await Promise.all([
    getCotizacionesDelComprador(user.id),
    getSolicitudesDelComprador(user.id),
    obtenerNotificaciones(),
    // Las direcciones de obra se leen directamente como en la página de perfil;
    // si la lectura falla, la dirección se trata como pendiente de completar.
    supabase
      .from('direcciones_obra')
      .select('id')
      .eq('user_id', user.id),
  ])

  const direcciones = direccionesRes.error ? [] : (direccionesRes.data ?? [])

  const conteos = new Map<string, number>()
  for (const cot of cotizaciones) {
    conteos.set(cot.estado, (conteos.get(cot.estado) ?? 0) + 1)
  }

  // Una solicitud está abierta si alguna de sus cotizaciones sigue pendiente o
  // respondida; se cuenta una sola vez por solicitud.
  const solicitudesAbiertasIds = new Set(
    cotizaciones
      .filter((cot) => ESTADOS_ABIERTOS.includes(cot.estado) && cot.solicitud_id)
      .map((cot) => cot.solicitud_id as string)
  )
  const solicitudesAbiertas = solicitudes.filter((s) => solicitudesAbiertasIds.has(s.id)).length

  const camposPerfil = [
    { slug: 'razon-social', label: 'Razón social', completo: Boolean(perfil.razon_social?.trim()) },
    { slug: 'rnc', label: 'RNC', completo: Boolean(perfil.rnc?.trim()) },
    { slug: 'telefono', label: 'Teléfono', completo: Boolean(perfil.telefono?.trim()) },
    { slug: 'direccion', label: 'Dirección de obra', completo: direcciones.length > 0 },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hola, {perfil.nombre}</h1>
        <p className="mt-1 text-sm text-gray-500">Este es el resumen de tu cuenta.</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          <Store className="h-4 w-4" />
          Ir al catálogo
        </Link>
        <Link
          href="/solicitudes/nueva"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Nueva solicitud a varios proveedores
        </Link>
      </div>

      <section aria-label="Mis cotizaciones" className="mb-8">
        <h2 className="mb-3 font-semibold text-gray-900">Mis cotizaciones</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {ESTADOS_COTIZACION.map(({ estado, label, icono: Icono }) => (
            <Link
              key={estado}
              data-testid={`cuenta-cotizacion-${estado}`}
              href={`/mis-cotizaciones?estado=${estado}`}
              className="rounded-2xl border bg-white p-5 shadow-sm transition-colors hover:border-orange-400"
            >
              <span className="inline-flex items-center justify-center rounded-xl bg-orange-50 p-2.5 text-orange-600">
                <Icono className="h-5 w-5" />
              </span>
              <p className="mt-3 text-2xl font-bold text-gray-900">{conteos.get(estado) ?? 0}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link
          data-testid="cuenta-solicitudes"
          href="/solicitudes"
          className="rounded-2xl border bg-white p-5 shadow-sm transition-colors hover:border-orange-400"
        >
          <span className="inline-flex items-center justify-center rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <ClipboardList className="h-5 w-5" />
          </span>
          <p className="mt-3 text-2xl font-bold text-gray-900">{solicitudesAbiertas}</p>
          <p className="text-sm text-gray-500">Solicitudes abiertas</p>
        </Link>
        <Link
          data-testid="cuenta-notificaciones"
          href="/notificaciones"
          className="rounded-2xl border bg-white p-5 shadow-sm transition-colors hover:border-orange-400"
        >
          <span className="inline-flex items-center justify-center rounded-xl bg-purple-50 p-2.5 text-purple-600">
            <Bell className="h-5 w-5" />
          </span>
          <p className="mt-3 text-2xl font-bold text-gray-900">{notificaciones.noLeidas}</p>
          <p className="text-sm text-gray-500">Notificaciones sin leer</p>
        </Link>
      </div>

      <section
        data-testid="cuenta-perfil"
        aria-label="Mi perfil"
        className="rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-900">
            <Link href="/perfil" className="hover:underline">
              Mi perfil
            </Link>
          </h2>
          <Link
            href="/perfil"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Editar perfil
          </Link>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Completa estos datos para agilizar tus solicitudes.
        </p>
        <ul className="mt-4 space-y-2">
          {camposPerfil.map((campo) => (
            <li key={campo.slug} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-700">{campo.label}</span>
              <span
                data-testid={`cuenta-perfil-${campo.slug}`}
                className={
                  campo.completo
                    ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
                    : 'rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700'
                }
              >
                {campo.completo ? 'Completo' : 'Pendiente'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
