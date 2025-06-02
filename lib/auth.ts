import { supabase } from "./supabase"

export async function verifyToken(token: string) {
  try {
    const { data, error } = await supabase
      .from("tokens")
      .select(`
        *,
        client:clients(*)
      `)
      .eq("token", token)
      .eq("used", false)
      .single()

    if (error || !data) {
      return { valid: false, error: "Code d'accès invalide ou déjà utilisé" }
    }

    // Vérifier l'expiration si définie
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: "Code d'accès expiré" }
    }

    return { valid: true, tokenData: data }
  } catch (error) {
    return { valid: false, error: "Erreur lors de la vérification" }
  }
}

export async function markTokenAsUsedAndDelete(tokenId: string) {
  try {
    // Marquer comme utilisé d'abord
    await supabase
      .from("tokens")
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq("id", tokenId)

    return true
  } catch (error) {
    console.error("Erreur lors de la mise à jour du token:", error)
    return false
  }
}
