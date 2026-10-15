import { redirect } from 'next/navigation'

/** Alias histórico: la ayuda vive ahora en la página de contacto. */
export default function AyudaPage(): never {
  redirect('/contacto')
}
