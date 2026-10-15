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
            «Resuélvelo» es el nombre comercial de la plataforma. La entidad legal que la opera se
            identifica como <strong>[Razón social pendiente]</strong>. Resuélvelo es un marketplace
            B2B que conecta compradores profesionales (contratistas, constructoras y PYMEs) con
            proveedores de materiales, insumos y servicios en República Dominicana. Actuamos
            únicamente como intermediarios tecnológicos: facilitamos el descubrimiento de
            proveedores y el intercambio de cotizaciones, pero no somos parte de las transacciones
            comerciales entre compradores y proveedores.
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
          <h2 className="text-base font-semibold text-gray-900">5. Cancelación por el comprador</h2>
          <p className="mt-2 leading-relaxed">
            Cada cancelación exige un motivo. El comprador puede solicitar la cancelación de una
            cotización antes de que el pedido sea despachado y debe registrar el motivo en la
            plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">6. Cancelación por el proveedor</h2>
          <p className="mt-2 leading-relaxed">
            El proveedor puede cancelar una cotización cuando le sea imposible cumplir con lo
            acordado. También debe registrar el motivo de la cancelación en la plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">7. Disputas</h2>
          <p className="mt-2 leading-relaxed">
            Si surge una disputa por un pedido, repórtala desde la página de{' '}
            <Link href="/contacto" className="font-medium text-orange-500 hover:underline">
              Contacto
            </Link>{' '}
            indicando el número de cotización o pedido, el motivo y la evidencia que la respalde.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">8. Comisiones</h2>
          <p className="mt-2 leading-relaxed">
            La comisión de Resuélvelo es 0 % por ahora. Si en el futuro cambia, se informará en
            esta página antes de aplicarse.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">9. Protección de datos</h2>
          <p className="mt-2 leading-relaxed">
            Tratamos los datos personales de acuerdo con la Ley 172-13 de protección de datos
            personales de la República Dominicana.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">10. Limitación de responsabilidad</h2>
          <p className="mt-2 leading-relaxed">
            Resuélvelo se ofrece &quot;tal cual&quot;, como proyecto en etapa de producto mínimo viable
            (MVP). No garantizamos disponibilidad ininterrumpida ni la exactitud de la información
            publicada por terceros proveedores.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">11. Contacto</h2>
          <p className="mt-2 leading-relaxed">
            Para dudas sobre estos términos, escríbenos desde la página de{' '}
            <Link href="/contacto" className="font-medium text-orange-500 hover:underline">
              Contacto
            </Link>
            .
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
