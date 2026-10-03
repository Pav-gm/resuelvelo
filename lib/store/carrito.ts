import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ItemCarrito, Producto } from '@/types'

interface CarritoStore {
  items: ItemCarrito[]
  agregar: (producto: Producto, cantidad?: number) => void
  quitar: (productoId: string) => void
  actualizarCantidad: (productoId: string, cantidad: number) => void
  vaciar: () => void
  total: () => number
  cantidadTotal: () => number
}

export const useCarritoStore = create<CarritoStore>()(
  persist(
    (set, get) => ({
      items: [],

      agregar: (producto, cantidad = 1) => {
        // Cantidades no enteras positivas y productos sin stock se ignoran.
        if (!Number.isInteger(cantidad) || cantidad <= 0) return
        if (producto.stock <= 0) return
        const items = get().items
        const existente = items.find((i) => i.producto.id === producto.id)
        if (existente) {
          set({
            items: items.map((i) =>
              i.producto.id === producto.id
                ? { ...i, cantidad: Math.min(i.cantidad + cantidad, producto.stock) }
                : i
            ),
          })
        } else {
          set({
            items: [...items, { producto, cantidad: Math.min(cantidad, producto.stock) }],
          })
        }
      },

      quitar: (productoId) =>
        set({ items: get().items.filter((i) => i.producto.id !== productoId) }),

      actualizarCantidad: (productoId, cantidad) => {
        // Cero o negativo sigue quitando la línea; positivo se limita al stock.
        if (cantidad <= 0) {
          get().quitar(productoId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.producto.id === productoId
              ? { ...i, cantidad: Math.min(cantidad, i.producto.stock) }
              : i
          ),
        })
      },

      vaciar: () => set({ items: [] }),

      total: () =>
        get().items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0),

      cantidadTotal: () =>
        get().items.reduce((acc, i) => acc + i.cantidad, 0),
    }),
    { name: 'resuelvelo-carrito' }
  )
)
