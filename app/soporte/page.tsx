import { redirect } from 'next/navigation'

/** Alias histórico: el soporte vive ahora en la página de contacto. */
export default function SoportePage(): never {
  redirect('/contacto')
}
