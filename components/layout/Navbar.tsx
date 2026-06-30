'use client'

import Link from 'next/link'
import { ShoppingCart, Store, User, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useCarritoStore } from '@/lib/store/carrito'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const cantidadTotal = useCarritoStore((s) => s.cantidadTotal)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Store className="h-6 w-6 text-orange-500" />
          <span className="text-xl font-bold text-gray-900">
            Resuél<span className="text-orange-500">velo</span>
          </span>
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/catalogo" className="text-gray-600 hover:text-orange-500 transition-colors">
            Catálogo
          </Link>
          <Link href="/proveedores" className="text-gray-600 hover:text-orange-500 transition-colors">
            Proveedores
          </Link>
          <Link href="/como-funciona" className="text-gray-600 hover:text-orange-500 transition-colors">
            ¿Cómo funciona?
          </Link>
        </nav>

        {/* Actions — desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/catalogo" className="relative">
            <Button variant="ghost" size="icon" aria-label="Carrito">
              <ShoppingCart className="h-5 w-5" />
              {cantidadTotal() > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                  {cantidadTotal()}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">
              <User className="mr-1.5 h-4 w-4" />
              Ingresar
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
              Registrarse
            </Button>
          </Link>
        </div>

        {/* Hamburger — mobile */}
        <button
          className="md:hidden"
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label="Menú"
        >
          {menuAbierto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={cn('md:hidden border-t bg-white', menuAbierto ? 'block' : 'hidden')}>
        <nav className="flex flex-col gap-1 px-4 py-3 text-sm font-medium">
          <Link href="/catalogo" className="py-2 text-gray-700 hover:text-orange-500" onClick={() => setMenuAbierto(false)}>Catálogo</Link>
          <Link href="/proveedores" className="py-2 text-gray-700 hover:text-orange-500" onClick={() => setMenuAbierto(false)}>Proveedores</Link>
          <Link href="/como-funciona" className="py-2 text-gray-700 hover:text-orange-500" onClick={() => setMenuAbierto(false)}>¿Cómo funciona?</Link>
          <div className="mt-2 flex gap-2 pb-2">
            <Link href="/login" className="flex-1" onClick={() => setMenuAbierto(false)}>
              <Button variant="outline" size="sm" className="w-full">Ingresar</Button>
            </Link>
            <Link href="/register" className="flex-1" onClick={() => setMenuAbierto(false)}>
              <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white">Registrarse</Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
