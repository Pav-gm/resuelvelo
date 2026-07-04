import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de privacidad — Resuélvelo',
}

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Política de privacidad</h1>
      <p className="mt-2 text-sm text-gray-400">Última actualización: julio de 2026</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-gray-600">
        <section>
          <h2 className="text-base font-semibold text-gray-900">1. Información que recopilamos</h2>
          <p className="mt-2 leading-relaxed">
            Al registrarte, recopilamos tu nombre, email y rol (comprador o proveedor). Si te
            registras como proveedor, también recopilamos el nombre y descripción de tu empresa.
            Al usar el carrito y solicitar cotizaciones, guardamos los productos y cantidades
            asociados a tu solicitud.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">2. Cómo usamos tu información</h2>
          <p className="mt-2 leading-relaxed">
            Usamos tu información para operar la plataforma: autenticarte, mostrar tu catálogo o
            historial de cotizaciones, y conectar compradores con proveedores. No vendemos tu
            información personal a terceros.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">3. Almacenamiento y seguridad</h2>
          <p className="mt-2 leading-relaxed">
            Los datos se almacenan en Supabase (PostgreSQL) con políticas de seguridad a nivel de
            fila (Row Level Security), de modo que cada usuario solo puede ver y modificar la
            información que le corresponde. Las contraseñas nunca se almacenan en texto plano; el
            proveedor de autenticación las gestiona de forma cifrada.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">4. Tus derechos</h2>
          <p className="mt-2 leading-relaxed">
            Puedes solicitar la actualización o eliminación de tu cuenta y datos asociados
            contactando a través de los canales indicados en la plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900">5. Cookies</h2>
          <p className="mt-2 leading-relaxed">
            Usamos cookies estrictamente necesarias para mantener tu sesión iniciada. No usamos
            cookies de rastreo publicitario.
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
