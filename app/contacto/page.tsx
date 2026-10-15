import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contacto — Resuélvelo',
}

const WHATSAPP_EJEMPLO = 'WhatsApp de ejemplo del seed'
const CORREO_EJEMPLO = 'Correo de ejemplo del seed'
const HORARIO_EJEMPLO = 'Horario de atención de ejemplo del seed'

/** Deja el número internacional en el formato que exige `wa.me`: solo dígitos. */
function numeroParaWaMe(valor: string): string {
  return valor.replace(/[\s+\-()]/g, '')
}

/**
 * Canal de soporte público. Lee las variables opcionales de entorno y, cuando
 * faltan, muestra textos de ejemplo en lugar de enlaces sin destino.
 */
export default function ContactoPage(): React.JSX.Element {
  const whatsapp = process.env.NEXT_PUBLIC_SOPORTE_WHATSAPP?.trim() || null
  const correo = process.env.NEXT_PUBLIC_SOPORTE_EMAIL?.trim() || null
  const numeroWhatsApp = whatsapp ? numeroParaWaMe(whatsapp) : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Contacto</h1>
      <p className="mt-2 text-sm text-gray-500">
        ¿Necesitas ayuda con una cotización, un pedido o una devolución? Escríbenos.
      </p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-gray-600">
        <section>
          <h2 className="text-base font-semibold text-gray-900">WhatsApp Business</h2>
          {numeroWhatsApp ? (
            <p className="mt-2 leading-relaxed">
              Escríbenos por WhatsApp al{' '}
              <a
                href={`https://wa.me/${numeroWhatsApp}`}
                className="font-medium text-orange-500 hover:underline"
              >
                {whatsapp}
              </a>
              .
            </p>
          ) : (
            <p className="mt-2 leading-relaxed">{WHATSAPP_EJEMPLO}</p>
          )}
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">Correo electrónico</h2>
          {correo ? (
            <p className="mt-2 leading-relaxed">
              Escríbenos a{' '}
              <a
                href={`mailto:${correo}`}
                className="font-medium text-orange-500 hover:underline"
              >
                {correo}
              </a>
              .
            </p>
          ) : (
            <p className="mt-2 leading-relaxed">{CORREO_EJEMPLO}</p>
          )}
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">Horario de atención</h2>
          <p className="mt-2 leading-relaxed">{HORARIO_EJEMPLO}</p>
        </section>
      </div>
    </div>
  )
}
