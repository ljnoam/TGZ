// Générateur de codes d'accès uniques
export function generateAccessCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function generateExpirationDate(days = 7): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}
