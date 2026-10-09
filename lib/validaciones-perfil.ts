export function esRncValido(rnc: string): boolean {
  return rnc === '' || /^[0-9]{9}(?:[0-9]{2})?$/.test(rnc)
}

export function esTelefonoDoValido(telefono: string): boolean {
  if (telefono === '') return true

  const digitos = telefono.replace(/[ \-()]/g, '')

  return /^(?:\+1|1)?(?:809|829|849)\d{7}$/.test(digitos)
}

export function normalizarTelefonoDo(telefono: string): string {
  let digitos = telefono.replace(/[ \-()]/g, '')
  if (digitos.startsWith('+1')) digitos = digitos.slice(1)
  return digitos.length === 11 && digitos.startsWith('1') ? digitos.slice(1) : digitos
}
