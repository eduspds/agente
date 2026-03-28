export function maskApiKey(value: string | null | undefined): string {
  if (!value || value.length < 4) return '••••'
  return `••••${value.slice(-4)}`
}
