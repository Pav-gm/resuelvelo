import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos de uso — Resuélvelo',
}

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Términos de uso</h1>
      <p className="mt-2 text-sm text-gray-400">Última actualización: julio de 2026</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-gray-600">
        <section>
          <h2 className="text-base font-semibold text-gray-900">1. Sobre Resuélvelo</h2>
          <p className="mt-2 leading-relaxed">
            Resuélvelo es un marketplace B2B que conecta compradores profesionales (contratistas,
            constructoras y PYMEs) con proveedores de materiales, insumos y servicios en República
            Dominicana. Actuamos únicamente como intermediarios tecnológicos: facilitamos el
            descubrimiento de proveedores y el intercambio de cotizaciones, pero no somos parte de
            las transacciones comerciales entre compradores y proveedores.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">2. Cuentas de usuario</h2>
          <p className="mt-2 leading-relaxed">
            Para usar la plataforma debes registrarte con información veraz. Eres responsable de
            mantener la confidencialidad de tu contraseña y de toda la actividad que ocurra en tu
            cuenta. Puedes registrarte como <strong>comprador</strong> o <strong>proveedor</strong>;
            cada rol tiene funciones distintas dentro de la plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">3. Uso de la plataforma</h2>
          <p className="mt-2 leading-relaxed">
            Los proveedores son responsables de la exactitud de la información de sus productos
            (precio, stock, descripción). Los compradores son responsables de verificar los detalles
            de una cotización antes de aceptarla. Está prohibido publicar contenido falso, fraudulento
            o que infrinja derechos de terceros.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">4. Cotizaciones</h2>
          <p className="mt-2 leading-relaxed">
            Las cotizaciones generadas en la plataforma son solicitudes de intención comercial entre
            comprador y proveedor. Los acuerdos de pago, entrega y garantía se realizan directamente
            entre las partes, fuera de la plataforma, salvo que se indique lo contrario en una versión
            futura del servicio.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">5. Limitación de responsabilidad</h2>
          <p className="mt-2 leading-relaxed">
            Resuélvelo se ofrece &quot;tal cual&quot;, como proyecto en etapa de producto mínimo viable
            (MVP). No garantizamos disponibilidad ininterrumpida ni la exactitud de la información
            publicada por terceros proveedores.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">6. Contacto</h2>
          <p className="mt-2 leading-relaxed">
            Para dudas sobre estos términos, contáctanos a través de los canales indicados en la
            plataforma.
          </p>
        </section>
      </div>

      <p className="mt-10 text-xs text-gray-400">
        Este documento es un modelo general para el MVP y no sustituye asesoría legal profesional.
      </p>

      <Link href="/" className="mt-6 inline-block text-sm font-medium text-orange-500 hover:underline">
        ← Volver al inicio
      </Link>
    </div>
  )
}
