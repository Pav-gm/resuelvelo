import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Devoluciones y cancelaciones — Resuélvelo',
}

export default function DevolucionesPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Devoluciones y cancelaciones</h1>
      <p className="mt-2 text-sm text-gray-400">Política vigente: octubre de 2026</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-gray-600">
        <section>
          <h2 className="text-base font-semibold text-gray-900">1. Plazo para reportar</h2>
          <p className="mt-2 leading-relaxed">
            Reporta daños, faltantes o producto incorrecto dentro de las 48 horas siguientes a la
            recepción del pedido. Pasado ese plazo, el proveedor puede no aceptar la devolución.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">2. Cómo reportar un caso</h2>
          <p className="mt-2 leading-relaxed">
            Escríbenos desde la página de{' '}
            <Link href="/contacto" className="font-medium text-orange-500 hover:underline">
              Contacto
            </Link>{' '}
            e incluye el número de cotización o pedido, el motivo del reporte y la evidencia
            (fotos o documentos) que respalde el caso.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">
            3. Quién cubre el flete de devolución
          </h2>
          <p className="mt-2 leading-relaxed">
            El proveedor cubre el flete de devolución cuando hubo daño, faltante o error de
            despacho. Si solicitas la devolución por cambio de decisión, el comprador cubre el
            flete.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">4. Cancelaciones</h2>
          <p className="mt-2 leading-relaxed">
            Puedes cancelar sin cargo antes de que el proveedor acepte la cotización. Una vez
            aceptada, solo puedes cancelar antes del despacho, contactando al proveedor.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">5. Pagos y reembolsos</h2>
          <p className="mt-2 leading-relaxed">
            Resuélvelo no procesa pagos ni reembolsos. Los acuerdos de pago, devolución y reembolso
            se gestionan directamente entre comprador y proveedor.
          </p>
        </section>
      </div>

      <Link href="/" className="mt-6 inline-block text-sm font-medium text-orange-500 hover:underline">
        ← Volver al inicio
      </Link>
    </div>
  )
}
