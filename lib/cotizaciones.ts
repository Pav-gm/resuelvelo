/**
 * Formato uniforme del número visible de una cotización.
 * Ejemplos: 123 -> `COT-000123`; 1234567 -> `COT-1234567`.
 */
export function formatNumeroCotizacion(numero: number): string {
  return `COT-${String(numero).padStart(6, '0')}`
}

const ZONA_SANTO_DOMINGO = 'America/Santo_Domingo'

function componentesFechaEnSantoDomingo(ahora: Date = new Date()): {
  anio: number
  mes: number
  dia: number
} {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_SANTO_DOMINGO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora)
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? ''

  return {
    anio: Number(valor('year')),
    mes: Number(valor('month')),
    dia: Number(valor('day')),
  }
}

function fechaISODesdeComponentes(anio: number, mes: number, dia: number): string {
  return `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function hoyISOEnSantoDomingo(ahora?: Date): string {
  const { anio, mes, dia } = componentesFechaEnSantoDomingo(ahora)
  return fechaISODesdeComponentes(anio, mes, dia)
}

export function sumarDiasISOEnSantoDomingo(dias: number, ahora?: Date): string {
  const { anio, mes, dia } = componentesFechaEnSantoDomingo(ahora)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  return fechaISODesdeComponentes(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate())
}

export function esFechaISOFuturaEnSantoDomingo(fecha: string, ahora?: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const validacion = new Date(Date.UTC(anio, mes - 1, dia))
  if (
    validacion.getUTCFullYear() !== anio ||
    validacion.getUTCMonth() + 1 !== mes ||
    validacion.getUTCDate() !== dia
  ) return false

  return fecha > hoyISOEnSantoDomingo(ahora)
}
