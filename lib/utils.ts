import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatearPrecio(valor: number): string {
  return `RD$ ${new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)}`
}

export function formatearFecha(valor: string | Date, opciones?: { conHora?: boolean }): string {
  const date = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(date.getTime())) return '—'

  const zona = 'America/Santo_Domingo'
  const fecha = new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: zona,
  }).format(date)

  if (!opciones?.conHora) return fecha

  const hora = new Intl.DateTimeFormat('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: zona,
  }).formatToParts(date)
  const hora24 = Number(hora.find((parte) => parte.type === 'hour')?.value)
  const minuto = hora.find((parte) => parte.type === 'minute')?.value
  const horaNumero = ((hora24 + 11) % 12) + 1
  const sufijo = hora24 < 12 ? 'a. m.' : 'p. m.'

  return `${fecha}, ${horaNumero}:${minuto} ${sufijo}`
}
