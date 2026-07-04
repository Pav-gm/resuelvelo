/**
 * Tests del store de carrito (Zustand)
 * Validan: agregar, quitar, actualizar cantidad, vaciar, total, cantidadTotal
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useCarritoStore } from '@/lib/store/carrito'
import type { Producto } from '@/types'

const PRODUCTO_A: Producto = {
  id: 'p1',
  proveedor_id: 'prov1',
  categoria_id: 'cat1',
  nombre: 'Tubo PVC 4"',
  precio: 680,
  unidad: 'unidad',
  stock: 100,
  activo: true,
  created_at: '',
}

const PRODUCTO_B: Producto = {
  id: 'p2',
  proveedor_id: 'prov2',
  categoria_id: 'cat1',
  nombre: 'Cemento Portland',
  precio: 850,
  unidad: 'saco',
  stock: 50,
  activo: true,
  created_at: '',
}

beforeEach(() => {
  useCarritoStore.getState().vaciar()
})

describe('Carrito — agregar productos', () => {
  it('agrega un producto con cantidad 1 por defecto', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A)
    const { items } = useCarritoStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].producto.id).toBe('p1')
    expect(items[0].cantidad).toBe(1)
  })

  it('agrega un producto con cantidad personalizada', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A, 5)
    const { items } = useCarritoStore.getState()
    expect(items[0].cantidad).toBe(5)
  })

  it('incrementa la cantidad si el producto ya existe en el carrito', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A, 2)
    useCarritoStore.getState().agregar(PRODUCTO_A, 3)
    const { items } = useCarritoStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].cantidad).toBe(5)
  })

  it('agrega productos distintos como items separados', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A)
    useCarritoStore.getState().agregar(PRODUCTO_B)
    const { items } = useCarritoStore.getState()
    expect(items).toHaveLength(2)
  })
})

describe('Carrito — quitar productos', () => {
  it('quita un producto por ID', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A)
    useCarritoStore.getState().agregar(PRODUCTO_B)
    useCarritoStore.getState().quitar('p1')
    const { items } = useCarritoStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].producto.id).toBe('p2')
  })

  it('no falla al quitar un producto que no existe', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A)
    useCarritoStore.getState().quitar('inexistente')
    expect(useCarritoStore.getState().items).toHaveLength(1)
  })
})

describe('Carrito — actualizar cantidad', () => {
  it('actualiza la cantidad de un producto existente', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A)
    useCarritoStore.getState().actualizarCantidad('p1', 10)
    expect(useCarritoStore.getState().items[0].cantidad).toBe(10)
  })

  it('quita el producto si la cantidad se pone en 0', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A)
    useCarritoStore.getState().actualizarCantidad('p1', 0)
    expect(useCarritoStore.getState().items).toHaveLength(0)
  })

  it('quita el producto si la cantidad es negativa', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A)
    useCarritoStore.getState().actualizarCantidad('p1', -1)
    expect(useCarritoStore.getState().items).toHaveLength(0)
  })
})

describe('Carrito — vaciar', () => {
  it('elimina todos los items del carrito', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A)
    useCarritoStore.getState().agregar(PRODUCTO_B)
    useCarritoStore.getState().vaciar()
    expect(useCarritoStore.getState().items).toHaveLength(0)
  })
})

describe('Carrito — totales', () => {
  it('calcula el total correctamente', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A, 2) // 680 * 2 = 1360
    useCarritoStore.getState().agregar(PRODUCTO_B, 1) // 850 * 1 = 850
    expect(useCarritoStore.getState().total()).toBe(2210)
  })

  it('retorna 0 cuando el carrito está vacío', () => {
    expect(useCarritoStore.getState().total()).toBe(0)
  })

  it('calcula la cantidad total de unidades', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A, 3)
    useCarritoStore.getState().agregar(PRODUCTO_B, 2)
    expect(useCarritoStore.getState().cantidadTotal()).toBe(5)
  })
})
