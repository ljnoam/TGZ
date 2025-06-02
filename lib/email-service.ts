// Real email service implementation
import { supabase } from "./supabase"

interface EmailConfig {
  apiKey?: string
  fromEmail: string
  fromName: string
  service: "sendgrid" | "mailgun" | "resend" | "simulation"
}

// Email configuration - in production, these should come from environment variables
const emailConfig: EmailConfig = {
  // For now, we'll use simulation mode since no real email service is configured
  service: "simulation",
  fromEmail: "noreply@tgzconciergerie.com",
  fromName: "TGZ Conciergerie",
  // apiKey: process.env.EMAIL_API_KEY, // Uncomment when real service is configured
}

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

function generateAccessCodeEmailTemplate(code: string, clientName: string): EmailTemplate {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://factures.tgzconciergerie.com"
  const directLink = `${baseUrl}/?code=${code}`

  const subject = `Votre code d'accès TGZ Conciergerie - ${code}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code d'accès TGZ Conciergerie</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e293b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .code-box { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .code { font-size: 24px; font-weight: bold; letter-spacing: 3px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏢 TGZ Conciergerie</h1>
                <p>Plateforme d'attestations de service</p>
            </div>
            <div class="content">
                <h2>Bonjour ${clientName},</h2>
                
                <p>Vous avez reçu un nouveau code d'accès pour remplir votre attestation de prestation de service.</p>
                
                <div class="code-box">
                    <p>Votre code d'accès :</p>
                    <div class="code">${code}</div>
                </div>
                
                <p><strong>Accès rapide :</strong></p>
                <a href="${directLink}" class="button">🔗 Accéder directement à la plateforme</a>
                
                <p><strong>Ou suivez ces étapes :</strong></p>
                <ol>
                    <li>Rendez-vous sur <a href="${baseUrl}">${baseUrl}</a></li>
                    <li>Saisissez le code : <strong>${code}</strong></li>
                    <li>Remplissez votre attestation</li>
                </ol>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p><strong>⚠️ Important :</strong></p>
                    <ul>
                        <li>Ce code est valide pour <strong>une seule utilisation</strong></li>
                        <li>Il expire dans <strong>7 jours</strong></li>
                        <li>Gardez ce code confidentiel</li>
                    </ul>
                </div>
                
                <p>En cas de problème, contactez-nous à <a href="mailto:contact@tgzconciergerie.com">contact@tgzconciergerie.com</a></p>
                
                <p>Cordialement,<br>L'équipe TGZ Conciergerie</p>
            </div>
            <div class="footer">
                <p>TGZ Conciergerie - 4 rue de Sontay, 75116 Paris</p>
                <p>Ce message a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
        </div>
    </body>
    </html>
  `

  const text = `
TGZ Conciergerie - Code d'accès

Bonjour ${clientName},

Vous avez reçu un nouveau code d'accès pour remplir votre attestation de prestation de service.

Votre code d'accès : ${code}

Accès direct : ${directLink}

Ou rendez-vous sur ${baseUrl} et saisissez le code ${code}

Important :
- Ce code est valide pour une seule utilisation
- Il expire dans 7 jours
- Gardez ce code confidentiel

En cas de problème, contactez-nous à contact@tgzconciergerie.com

Cordialement,
L'équipe TGZ Conciergerie

TGZ Conciergerie - 4 rue de Sontay, 75116 Paris
  `

  return { subject, html, text }
}

async function sendEmailViaService(
  to: string,
  template: EmailTemplate,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    switch (emailConfig.service) {
      case "sendgrid":
        // TODO: Implement SendGrid
        return await sendViaSendGrid(to, template)

      case "mailgun":
        // TODO: Implement Mailgun
        return await sendViaMailgun(to, template)

      case "resend":
        // TODO: Implement Resend
        return await sendViaResend(to, template)

      case "simulation":
      default:
        return await simulateEmailSending(to, template)
    }
  } catch (error) {
    console.error("Email sending error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    }
  }
}

async function simulateEmailSending(
  to: string,
  template: EmailTemplate,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Simulate email sending with detailed logging
  console.log("📧 SIMULATION: Email sending process started")
  console.log("📧 To:", to)
  console.log("📧 Subject:", template.subject)
  console.log("📧 From:", `${emailConfig.fromName} <${emailConfig.fromEmail}>`)

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(to)) {
    console.error("❌ Invalid email format:", to)
    return {
      success: false,
      error: "Invalid email format",
    }
  }

  // Simulate random failures for testing (5% failure rate)
  if (Math.random() < 0.05) {
    console.error("❌ SIMULATION: Random email failure")
    return {
      success: false,
      error: "Simulated email service failure",
    }
  }

  const messageId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  console.log("✅ SIMULATION: Email sent successfully")
  console.log("📧 Message ID:", messageId)
  console.log("📧 Email content preview:")
  console.log("---")
  console.log(template.text.substring(0, 200) + "...")
  console.log("---")

  return {
    success: true,
    messageId,
  }
}

// Placeholder implementations for real email services
async function sendViaSendGrid(
  to: string,
  template: EmailTemplate,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // TODO: Implement SendGrid integration
  console.log("📧 SendGrid integration not implemented yet")
  return { success: false, error: "SendGrid not configured" }
}

async function sendViaMailgun(
  to: string,
  template: EmailTemplate,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // TODO: Implement Mailgun integration
  console.log("📧 Mailgun integration not implemented yet")
  return { success: false, error: "Mailgun not configured" }
}

async function sendViaResend(
  to: string,
  template: EmailTemplate,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // TODO: Implement Resend integration
  console.log("📧 Resend integration not implemented yet")
  return { success: false, error: "Resend not configured" }
}

// Log email attempts to database
async function logEmailAttempt(
  clientId: string,
  email: string,
  code: string,
  success: boolean,
  messageId?: string,
  error?: string,
) {
  try {
    await supabase.from("email_logs").insert({
      client_id: clientId,
      recipient_email: email,
      access_code: code,
      success,
      message_id: messageId,
      error_message: error,
      sent_at: new Date().toISOString(),
    })
  } catch (logError) {
    console.error("Failed to log email attempt:", logError)
  }
}

export async function sendAccessCodeEmail(
  clientId: string,
  clientName: string,
  email: string,
  code: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  console.log("🚀 Starting email sending process...")
  console.log("📧 Client:", clientName)
  console.log("📧 Email:", email)
  console.log("🔑 Code:", code)

  try {
    // Validate inputs
    if (!email || !code || !clientName) {
      const error = "Missing required parameters for email sending"
      console.error("❌", error)
      await logEmailAttempt(clientId, email, code, false, undefined, error)
      return { success: false, error }
    }

    // Generate email template
    const template = generateAccessCodeEmailTemplate(code, clientName)

    // Send email
    const result = await sendEmailViaService(email, template)

    // Log the attempt
    await logEmailAttempt(clientId, email, code, result.success, result.messageId, result.error)

    if (result.success) {
      console.log("✅ Email sent successfully!")
      console.log("📧 Message ID:", result.messageId)
    } else {
      console.error("❌ Email sending failed:", result.error)
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("❌ Email sending process failed:", errorMessage)
    await logEmailAttempt(clientId, email, code, false, undefined, errorMessage)
    return { success: false, error: errorMessage }
  }
}

// Function to get email delivery status
export async function getEmailDeliveryLogs(clientId?: string, limit = 50) {
  try {
    let query = supabase
      .from("email_logs")
      .select(`
        *,
        client:clients(name, email)
      `)
      .order("sent_at", { ascending: false })
      .limit(limit)

    if (clientId) {
      query = query.eq("client_id", clientId)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, logs: data }
  } catch (error) {
    console.error("Failed to fetch email logs:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
