export function esRncValido(rnc: string): boolean {
  return rnc === '' || /^[0-9]{9}(?:[0-9]{2})?$/.test(rnc)
}
