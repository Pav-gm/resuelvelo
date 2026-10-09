import { obtenerNotificaciones } from './actions'
import { NotificacionLink } from '@/components/marketplace/NotificacionLink'
import { formatearFechaNotificacion } from '@/lib/notificaciones'

export default async function NotificacionesPage() {
  // Lista completa (sin límite) de las notificaciones propias; RLS autoriza.
  const { data, error } = await obtenerNotificaciones()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Notificaciones</h1>
      <p className="mb-6 text-sm text-gray-500">Todos tus avisos, del más reciente al más antiguo.</p>

      {error ? (
        <div className="rounded-2xl bg-white border p-12 text-center text-gray-500">
          <p>{error}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl bg-white border p-12 text-center text-gray-400">
          <p className="text-lg font-medium">No tienes notificaciones.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((n) => (
            <li
              key={n.id}
              data-testid="notificacion"
              className="rounded-2xl bg-white border p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {n.cotizacion_id ? (
                    <NotificacionLink
                      id={n.id}
                      leida={Boolean(n.leida_at)}
                      href={`/cotizaciones/${n.cotizacion_id}`}
                      className="font-semibold text-gray-900 hover:underline"
                    >
                      {n.titulo}
                    </NotificacionLink>
                  ) : (
                    <p className="font-semibold text-gray-900">{n.titulo}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-600">{n.cuerpo}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span>{formatearFechaNotificacion(n.created_at)}</span>
                    {!n.cotizacion_id && <span>Sin cotización asociada</span>}
                  </div>
                </div>
                <span
                  className={
                    n.leida_at
                      ? 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500'
                      : 'rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600'
                  }
                >
                  {n.leida_at ? 'Leída' : 'No leída'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
