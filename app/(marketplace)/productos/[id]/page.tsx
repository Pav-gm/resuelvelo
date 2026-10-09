import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BadgeCheck } from 'lucide-react'
import ProductoImagen from '@/components/marketplace/ProductoImagen'
import { creditoFoto } from '@/lib/creditos-fotos'
import AgregarProductoButton from '@/components/marketplace/AgregarProductoButton'
import { getProducto, getFeedbackDeProveedor } from '@/lib/data'

interface ProductoPageProps {
  params: Promise<{ id: string }>
}

const TITULO_GENERICO = 'Producto — Resuélvelo'
const DESCRIPCION_GENERICA =
  'Ficha de producto en Resuélvelo, el marketplace B2B de materiales y servicios.'

function formatearPrecio(precio: number): string {
  return `RD$ ${precio.toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export async function generateMetadata({ params }: ProductoPageProps): Promise<Metadata> {
  const { id } = await params
  if (!id) {
    return { title: TITULO_GENERICO, description: DESCRIPCION_GENERICA }
  }
  const producto = await getProducto(id)
  if (!producto) {
    return { title: TITULO_GENERICO, description: DESCRIPCION_GENERICA }
  }
  return {
    title: `${producto.nombre} — Resuélvelo`,
    description: producto.descripcion || producto.nombre,
  }
}

export default async function ProductoPage({ params }: ProductoPageProps) {
  const { id } = await params
  const producto = await getProducto(id)
  if (!producto) notFound()

  const proveedor = producto.proveedor
  // Un error o la ausencia de reseñas nunca debe impedir mostrar la ficha.
  const resumenResenas = proveedor
    ? await getFeedbackDeProveedor(proveedor.id).catch(() => null)
    : null
  const itbisIncluido = producto.itbis_incluido !== false
  // Existencias disponibles: stock total menos las unidades reservadas.
  const disponible = Math.max(0, producto.stock - (producto.stock_reservado ?? 0))
  const credito = creditoFoto(producto.id, producto.imagen_url)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <ProductoImagen
            imagenUrl={producto.imagen_url}
            nombre={producto.nombre}
            categoria={producto.categoria}
            tamanio="ficha"
          />
          {credito && (
            <p className="mt-2 text-xs text-gray-400">
              Foto:{' '}
              <a href={credito.pagina} target="_blank" rel="noopener noreferrer" className="underline">
                {credito.autor}
              </a>
              , {credito.licencia}, vía Wikimedia Commons
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            {producto.categoria && (
              <p className="text-xs font-medium text-orange-500">{producto.categoria.nombre}</p>
            )}
            <h1 className="mt-0.5 text-2xl font-bold text-gray-900">{producto.nombre}</h1>
            {producto.descripcion && (
              <p className="mt-2 text-sm text-gray-600">{producto.descripcion}</p>
            )}
          </div>

          {proveedor && (
            <Link
              href={`/proveedores/${proveedor.id}`}
              className="inline-flex w-fit items-center gap-1.5 text-sm text-gray-700 hover:text-orange-500"
            >
              <span>{proveedor.nombre_empresa}</span>
              {proveedor.verificado && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verificado
                </span>
              )}
              {resumenResenas && resumenResenas.conteo > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">
                    {resumenResenas.promedio.toFixed(2)}
                  </span>
                  <span className="text-yellow-400" aria-hidden="true">
                    {'★'.repeat(Math.round(resumenResenas.promedio))}
                    <span className="text-gray-300">
                      {'★'.repeat(5 - Math.round(resumenResenas.promedio))}
                    </span>
                  </span>
                  <span>
                    ({resumenResenas.conteo} reseña{resumenResenas.conteo !== 1 ? 's' : ''})
                  </span>
                </span>
              )}
            </Link>
          )}

          <div>
            <p className="text-2xl font-bold text-gray-900">{formatearPrecio(producto.precio)}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              <span>{itbisIncluido ? 'ITBIS incluido' : '+ ITBIS'}</span>
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-2xl border bg-white p-4 text-sm">
            <div>
              <dt className="text-xs text-gray-400">Unidad</dt>
              <dd className="text-gray-900">{producto.unidad}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Stock disponible</dt>
              <dd className="text-gray-900">{disponible}</dd>
            </div>
            {producto.subcategoria && (
              <div>
                <dt className="text-xs text-gray-400">Subcategoría</dt>
                <dd className="text-gray-900">{producto.subcategoria.nombre}</dd>
              </div>
            )}
            {producto.sku && (
              <div>
                <dt className="text-xs text-gray-400">SKU</dt>
                <dd className="text-gray-900">{producto.sku}</dd>
              </div>
            )}
          </dl>

          <AgregarProductoButton producto={producto} textoAgregar="Agregar al carrito" />

          <Link
            href={`/catalogo?proveedor=${proveedor?.id ?? producto.proveedor_id}`}
            className="w-fit text-sm font-medium text-orange-500 hover:underline"
          >
            Ver catálogo del proveedor
          </Link>
        </div>
      </div>

      {producto.especificaciones && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900">Especificaciones</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-gray-700">
            {producto.especificaciones}
          </p>
        </section>
      )}
    </div>
  )
}
