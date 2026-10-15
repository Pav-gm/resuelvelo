import { expect, test, type Locator, type Page } from '@playwright/test'

const REFERENCIA = /#COT-\d{6,}/
const ESPERA_MS = 20_000

function credencial(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}`)
  }
  return valor
}

async function iniciarSesion(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForURL((url) => url.pathname !== '/login')
}

async function primeraOpcionHabilitada(select: Locator): Promise<string> {
  return select.evaluate((elemento) => {
    const opciones = Array.from((elemento as HTMLSelectElement).options)
    const opcion = opciones.find((item) => !item.disabled && item.value !== '')
    return opcion?.value ?? ''
  })
}

async function elegirPrimeraOpcionHabilitada(select: Locator): Promise<void> {
  await expect(select).toBeEnabled()
  await expect.poll(() => primeraOpcionHabilitada(select)).not.toBe('')
  await select.selectOption(await primeraOpcionHabilitada(select))
}

function tarjetaCotizacion(page: Page, ...fragmentos: string[]): Locator {
  let tarjeta = page.locator('div.rounded-2xl.bg-white.border')
  for (const fragmento of fragmentos) {
    tarjeta = tarjeta.filter({ hasText: fragmento })
  }
  return tarjeta
}

async function retirarProducto(page: Page, nombre: string): Promise<void> {
  await page.goto('/proveedor/productos')
  const fila = page.locator('[data-testid="product-row"]').filter({
    has: page.getByRole('link', { name: nombre, exact: true }),
  })
  await expect(fila).toBeVisible({ timeout: ESPERA_MS })

  const archivar = fila.getByRole('button', { name: `Archivar ${nombre}`, exact: true })
  const eliminar = fila.getByRole('button', { name: `Eliminar ${nombre}`, exact: true })
  const boton = (await archivar.count()) > 0 ? archivar : eliminar
  if ((await boton.count()) === 0) {
    throw new Error(`No está la acción Archivar ${nombre} ni Eliminar ${nombre}`)
  }

  page.once('dialog', (dialog) => {
    void dialog.accept()
  })
  await boton.click()
  await expect(fila).toHaveCount(0, { timeout: ESPERA_MS })

  await page.goto(`/catalogo?busqueda=${encodeURIComponent(nombre)}`)
  await expect(page.getByRole('heading', { name: 'Catálogo de productos' })).toBeVisible()
  await expect(page.getByText('Sin resultados')).toBeVisible({ timeout: ESPERA_MS })
  await expect(page.getByRole('heading', { name: nombre, exact: true })).toHaveCount(0)
}

test('completa el ciclo de compra entre proveedor y comprador', async ({ browser }) => {
  test.setTimeout(180000)

  const proveedorEmail = credencial('E2E_PROVEEDOR_EMAIL')
  const proveedorPassword = credencial('E2E_PROVEEDOR_PASSWORD')
  const compradorEmail = credencial('E2E_COMPRADOR_EMAIL')
  const compradorPassword = credencial('E2E_COMPRADOR_PASSWORD')

  const contextoProveedor = await browser.newContext()
  const contextoComprador = await browser.newContext()
  const proveedor = await contextoProveedor.newPage()
  const comprador = await contextoComprador.newPage()
  const nombre = `E2E ${Date.now()}`
  let publicado = false

  try {
    try {
      await iniciarSesion(proveedor, proveedorEmail, proveedorPassword)
      await expect(proveedor.getByRole('heading', { name: 'Panel de proveedor' })).toBeVisible()
      await proveedor.getByRole('link', { name: 'Nuevo producto' }).click()

      await proveedor.getByLabel(/Nombre del producto/).fill(nombre)
      await proveedor.getByLabel(/Precio \(RD\$\)/).fill('100')
      await proveedor.getByLabel(/^Unidad/).fill('unidad')
      await proveedor.getByLabel(/Stock disponible/).fill('10')
      await elegirPrimeraOpcionHabilitada(proveedor.getByLabel(/^Categoría/))
      await elegirPrimeraOpcionHabilitada(proveedor.getByLabel(/^Subcategoría/))
      await proveedor.getByRole('button', { name: 'Publicar producto' }).click()
      await proveedor.waitForURL((url) => url.pathname === '/proveedor')
      publicado = true

      await expect(proveedor.getByRole('heading', { name: 'Panel de proveedor' })).toBeVisible()
      await expect(proveedor.getByRole('link', { name: nombre, exact: true })).toBeVisible({
        timeout: ESPERA_MS,
      })

      await iniciarSesion(comprador, compradorEmail, compradorPassword)
      await comprador.goto('/catalogo')
      const busqueda = comprador.getByPlaceholder('Buscar productos, materiales, marcas...')
      await busqueda.fill(nombre)
      await busqueda.press('Enter')
      await comprador.waitForURL(/busqueda=/)

      const ficha = comprador.locator('div.group').filter({
        has: comprador.getByRole('heading', { name: nombre, exact: true }),
      })
      await expect(ficha).toBeVisible({ timeout: ESPERA_MS })
      await ficha.getByRole('button', { name: 'Agregar', exact: true }).click()
      await comprador.getByRole('button', { name: 'Carrito', exact: true }).click()
      await comprador.getByRole('button', { name: 'Solicitar cotización' }).click()
      await comprador.waitForURL(/\/mis-cotizaciones/)

      const tarjetaNueva = tarjetaCotizacion(comprador, nombre)
      await expect(tarjetaNueva.first()).toBeVisible({ timeout: ESPERA_MS })
      const texto = await tarjetaNueva.first().innerText()
      const coincidencia = texto.match(REFERENCIA)
      if (!coincidencia) {
        throw new Error(`No se encontró una referencia #COT- en la cotización de ${nombre}`)
      }
      const referencia = coincidencia[0]
      expect(referencia).toMatch(REFERENCIA)

      await proveedor.goto('/proveedor/pedidos')
      const pedido = tarjetaCotizacion(proveedor, referencia, nombre)
      await expect(pedido).toContainText(nombre)
      await expect(pedido.getByText('Pendiente', { exact: true })).toBeVisible({ timeout: ESPERA_MS })
      await pedido.getByRole('button', { name: 'Responder con oferta', exact: true }).click()
      await pedido.getByRole('button', { name: 'Ofertar al precio de catálogo', exact: true }).click()
      await expect(pedido.getByText('Respondida', { exact: true })).toBeVisible({ timeout: ESPERA_MS })

      await comprador.goto('/mis-cotizaciones')
      const cotizacion = tarjetaCotizacion(comprador, referencia, nombre)
      await expect(cotizacion).toContainText(referencia)
      await expect(cotizacion.getByText('Respondida', { exact: true })).toBeVisible({
        timeout: ESPERA_MS,
      })
      await cotizacion.getByRole('button', { name: 'Aceptar oferta', exact: true }).click()
      await expect(cotizacion.getByText('Aceptada', { exact: true })).toBeVisible({ timeout: ESPERA_MS })

      await proveedor.goto('/proveedor/pedidos')
      await expect(pedido.getByText('Aceptada', { exact: true })).toBeVisible({ timeout: ESPERA_MS })
      await pedido.getByRole('button', { name: 'Marcar como despachada', exact: true }).click()
      await pedido
        .getByRole('dialog', { name: 'Confirmar despacho' })
        .getByRole('button', { name: 'Sí, marcar como despachada' })
        .click()
      await expect(pedido.getByText('Despachada', { exact: true })).toBeVisible({ timeout: ESPERA_MS })

      await comprador.goto('/mis-cotizaciones')
      await cotizacion.getByRole('button', { name: 'Confirmar recepción', exact: true }).click()
      await expect(cotizacion.getByText('Recibida', { exact: true })).toBeVisible({ timeout: ESPERA_MS })
    } finally {
      if (publicado) await retirarProducto(proveedor, nombre)
    }
  } finally {
    await contextoComprador.close()
    await contextoProveedor.close()
  }
})
