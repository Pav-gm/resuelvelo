import Link from 'next/link'
import { Store } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Store className="h-5 w-5 text-orange-500" />
              <span className="font-bold text-gray-900">
                Resuél<span className="text-orange-500">velo</span>
              </span>
            </Link>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              El marketplace B2B que conecta compradores con proveedores de materiales e insumos en República Dominicana.
            </p>
          </div>

          {/* Compradores */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">Compradores</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link href="/catalogo" className="hover:text-orange-500">Catálogo</Link></li>
              <li><Link href="/proveedores" className="hover:text-orange-500">Proveedores</Link></li>
              <li><Link href="/como-funciona" className="hover:text-orange-500">¿Cómo funciona?</Link></li>
            </ul>
          </div>

          {/* Proveedores */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">Proveedores</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link href="/register?rol=proveedor" className="hover:text-orange-500">Publicar productos</Link></li>
              <li><Link href="/proveedor" className="hover:text-orange-500">Panel de gestión</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link href="/terminos" className="hover:text-orange-500">Términos de uso</Link></li>
              <li><Link href="/privacidad" className="hover:text-orange-500">Privacidad</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Resuélvelo. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
