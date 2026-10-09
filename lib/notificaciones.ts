/**
 * Fecha y hora de un aviso en español de República Dominicana, con el formato
 * «8 de octubre de 2026, 02:53 p. m.».
 *
 * Se componen fecha y hora por separado porque el versionado de CLDR une ambas
 * con « a las » en algunas versiones de Node; así el formato es el mismo en
 * cualquier entorno.
 */
export function formatearFechaNotificacion(iso: string): string {
  const fecha = new Date(iso)
  const dia = fecha.toLocaleDateString('es-DO', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const hora = fecha.toLocaleTimeString('es-DO', {
    timeZone: 'America/Santo_Domingo',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${dia}, ${hora}`
}
