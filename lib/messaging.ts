// Services de messagerie (simulation pour l'instant)
import { supabase } from "./supabase" // Fixed import path
import { sendAccessCodeEmail } from "./email-service"

export async function sendEmailInvitation(
  email: string,
  code: string,
  clientId?: string,
  clientName?: string,
): Promise<boolean> {
  try {
    console.log("📧 Starting email invitation process...")
    console.log("📧 Email:", email)
    console.log("🔑 Code:", code)

    // Get client information if not provided
    let finalClientId = clientId
    let finalClientName = clientName

    if (!finalClientId || !finalClientName) {
      console.log("🔍 Looking up client information...")
      const { data: clientData, error } = await supabase.from("clients").select("id, name").eq("email", email).single()

      if (error || !clientData) {
        console.error("❌ Client not found for email:", email)
        return false
      }

      finalClientId = clientData.id
      finalClientName = clientData.name
    }

    // Send email using the dedicated email service
    const result = await sendAccessCodeEmail(finalClientId, finalClientName, email, code)

    if (result.success) {
      console.log("✅ Email invitation sent successfully")
      console.log("📧 Message ID:", result.messageId)
      return true
    } else {
      console.error("❌ Email invitation failed:", result.error)
      return false
    }
  } catch (error) {
    console.error("❌ Email invitation process failed:", error)
    return false
  }
}

export async function sendWhatsAppInvitation(phone: string, code: string, clientId?: string): Promise<boolean> {
  try {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://factures.tgzconciergerie.com"
    const directLink = `${baseUrl}/?code=${code}`

    console.log("📱 Starting WhatsApp invitation process...")
    console.log("📱 Phone:", phone)
    console.log("🔑 Code:", code)

    // Log WhatsApp attempt to database
    if (clientId) {
      try {
        await supabase.from("whatsapp_logs").insert({
          client_id: clientId,
          recipient_phone: phone,
          access_code: code,
          success: true, // We'll assume success for simulation
          sent_at: new Date().toISOString(),
        })
      } catch (logError) {
        console.error("Failed to log WhatsApp attempt:", logError)
      }
    }

    console.log("💬 WhatsApp message content:")
    console.log(`
🏢 *TGZ Conciergerie*

Bonjour ! Votre nouveau code d'accès pour l'attestation de prestation :

🔑 *Code :* ${code}

🔗 *Accès direct :* ${directLink}

⏰ Valide 7 jours, usage unique.

Cliquez sur le lien ou rendez-vous sur notre plateforme et saisissez le code.

Merci !
    `)

    // TODO: Intégrer Twilio ou WhatsApp Cloud API
    await new Promise((resolve) => setTimeout(resolve, 1500))

    console.log("✅ WhatsApp invitation sent successfully (simulated)")
    return true
  } catch (error) {
    console.error("❌ WhatsApp invitation failed:", error)
    return false
  }
}

// New function to check if client has active tokens
export async function checkClientActiveTokens(clientId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("tokens")
      .select("id")
      .eq("client_id", clientId)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())

    if (error) throw error

    return data && data.length > 0
  } catch (error) {
    console.error("Erreur vérification tokens actifs:", error)
    return false
  }
}

// Function to get delivery status for a specific client
export async function getClientDeliveryStatus(clientId: string) {
  try {
    const { data: emailLogs, error: emailError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("client_id", clientId)
      .order("sent_at", { ascending: false })
      .limit(10)

    if (emailError) throw emailError

    const { data: whatsappLogs, error: whatsappError } = await supabase
      .from("whatsapp_logs")
      .select("*")
      .eq("client_id", clientId)
      .order("sent_at", { ascending: false })
      .limit(10)

    // WhatsApp logs table might not exist yet, so we'll ignore errors
    const whatsappData = whatsappError ? [] : whatsappLogs

    return {
      success: true,
      emailLogs: emailLogs || [],
      whatsappLogs: whatsappData || [],
    }
  } catch (error) {
    console.error("Failed to get delivery status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
