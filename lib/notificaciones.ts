import { formatearFecha } from '@/lib/utils'

/**
 * Fecha y hora de un aviso en español de República Dominicana, con el formato
 * «8 de octubre de 2026, 2:53 p. m.».
 *
 * Delega en el formateador compartido de fecha y hora local, que compone fecha
 * y hora por separado para que el formato sea el mismo en cualquier entorno.
 */
export function formatearFechaNotificacion(iso: string): string {
  return formatearFecha(iso, { conHora: true })
}
