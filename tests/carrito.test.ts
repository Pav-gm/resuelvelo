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
  subcategoria_id: null,
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
  subcategoria_id: null,
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

describe('Carrito — topes de stock al agregar', () => {
  const productoConStock = (stock: number): Producto => ({ ...PRODUCTO_A, stock })

  it('ignora cantidades que no son enteros positivos y no toca el carrito', () => {
    const producto = productoConStock(10)
    useCarritoStore.getState().agregar(producto, 2)

    for (const cantidad of [0, -1, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      useCarritoStore.getState().agregar(producto, cantidad)
    }

    const { items } = useCarritoStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].cantidad).toBe(2)
    expect(items[0].producto.id).toBe(producto.id)
  })

  it('no agrega un producto con stock cero o negativo', () => {
    useCarritoStore.getState().agregar(productoConStock(0))
    useCarritoStore.getState().agregar(productoConStock(-3), 2)
    useCarritoStore.getState().agregar(PRODUCTO_B, 1)

    const { items } = useCarritoStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].producto.id).toBe(PRODUCTO_B.id)
  })

  it('limita la cantidad nueva al stock sin duplicar el producto', () => {
    const producto = productoConStock(4)
    useCarritoStore.getState().agregar(producto, 9)

    const { items } = useCarritoStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].cantidad).toBe(4)
    expect(items[0]).toMatchObject({ producto, cantidad: 4 })
  })

  it('permite agregar exactamente hasta el stock', () => {
    const producto = productoConStock(3)
    useCarritoStore.getState().agregar(producto, 3)
    expect(useCarritoStore.getState().items[0].cantidad).toBe(3)
  })

  it('limita la cantidad acumulada al stock y conserva una sola línea', () => {
    const producto = productoConStock(6)
    useCarritoStore.getState().agregar(producto, 4)
    useCarritoStore.getState().agregar(producto, 5)

    const { items } = useCarritoStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].cantidad).toBe(6)
  })

  it('no modifica la línea cuando ya está en el stock', () => {
    const producto = productoConStock(2)
    useCarritoStore.getState().agregar(producto, 2)
    useCarritoStore.getState().agregar(producto, 1)

    expect(useCarritoStore.getState().items).toHaveLength(1)
    expect(useCarritoStore.getState().items[0].cantidad).toBe(2)
    expect(useCarritoStore.getState().total()).toBe(producto.precio * 2)
  })
})

describe('Carrito — stock disponible con reservas', () => {
  it('limita agregar al stock disponible descontando reservas', () => {
    const producto: Producto = { ...PRODUCTO_A, stock: 299, stock_reservado: 213 }
    useCarritoStore.getState().agregar(producto, 162)
    useCarritoStore.getState().actualizarCantidad(producto.id, 162)

    const { items } = useCarritoStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].cantidad).toBe(86)
  })
})

describe('Carrito — actualizar cantidad con stock', () => {
  it('sigue quitando el producto con cantidad cero o negativa', () => {
    useCarritoStore.getState().agregar(PRODUCTO_A, 4)
    useCarritoStore.getState().agregar(PRODUCTO_B, 2)

    useCarritoStore.getState().actualizarCantidad('p1', 0)
    expect(useCarritoStore.getState().items.map((i) => i.producto.id)).toEqual(['p2'])

    useCarritoStore.getState().actualizarCantidad('p2', -8)
    expect(useCarritoStore.getState().items).toHaveLength(0)
  })

  it('limita una cantidad positiva al stock del producto', () => {
    const producto = { ...PRODUCTO_A, stock: 5 }
    useCarritoStore.getState().agregar(producto, 1)
    useCarritoStore.getState().actualizarCantidad(producto.id, 40)

    const { items } = useCarritoStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].cantidad).toBe(5)
  })

  it('conserva una cantidad positiva dentro del stock', () => {
    const producto = { ...PRODUCTO_A, stock: 8 }
    useCarritoStore.getState().agregar(producto, 1)
    useCarritoStore.getState().actualizarCantidad(producto.id, 4)

    expect(useCarritoStore.getState().items[0].cantidad).toBe(4)
    expect(useCarritoStore.getState().cantidadTotal()).toBe(4)
  })

  it('no crea una línea al actualizar un producto ausente', () => {
    useCarritoStore.getState().agregar(PRODUCTO_B, 1)
    useCarritoStore.getState().actualizarCantidad('inexistente', 3)

    expect(useCarritoStore.getState().items).toHaveLength(1)
    expect(useCarritoStore.getState().items[0].producto.id).toBe(PRODUCTO_B.id)
  })
})
