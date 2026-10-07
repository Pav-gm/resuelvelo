/**
 * Formato uniforme del número visible de una cotización.
 * Ejemplos: 123 -> `COT-000123`; 1234567 -> `COT-1234567`.
 */
export function formatNumeroCotizacion(numero: number): string {
  return `COT-${String(numero).padStart(6, '0')}`
}
