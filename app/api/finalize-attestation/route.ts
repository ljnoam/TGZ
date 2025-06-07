// app/api/finalize-attestation/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { tokenId, attestationData, pdfBase64 } = await request.json();

    // 1) Buffer depuis le Base64
    const base64 = pdfBase64.split(",")[1];
    const pdfBuffer = Buffer.from(base64, "base64");

    // 2) Upload vers Supabase Storage
    const fileName = `attestation_${tokenId}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("attestations")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadError) throw new Error(`Upload error: ${uploadError.message}`);

    // 3) Récupère l’URL publique
    const { data: urlData } = supabase.storage
      .from("attestations")
      .getPublicUrl(fileName);
    const pdfUrl = urlData.publicUrl;

    // 4) Prépare le payload pour passer en “completed”
    const fullPayload = {
      token_id:              tokenId,
      prestataire_nom:       attestationData.nom,
      prestataire_prenom:    attestationData.prenom,
      prestataire_adresse:   attestationData.adresse,
      prestataire_email:     attestationData.email || "",
      prestataire_telephone: attestationData.telephone || "",
      prestataire_siret:     attestationData.siret || "",
      client_nom:            attestationData.client_nom || "TGZ Conciergerie",
      client_adresse:        attestationData.client_adresse || "4 rue de sontay, 75116 Paris",
      prestation_description:
        attestationData.type_prestation === "evenement_sportif"
          ? `Roland-Garros - ${attestationData.court} - ${attestationData.categorie} - ${attestationData.autres_precisions || ""}`
          : attestationData.autres_precisions || "",
      prestation_date_debut: attestationData.date,
      prestation_date_fin:   attestationData.date,
      prestation_montant:    parseFloat(attestationData.prix) || 0,
      prestation_lieu:       attestationData.ville,
      status:                "completed",
      pdf_generated:         true,
      pdf_url:               pdfUrl,
      sent_at:               new Date().toISOString(),
      updated_at:            new Date().toISOString(),
    };

    // 5) Trouve le draft existant
    const { data: existingDraft, error: findError } = await supabase
      .from("attestations")
      .select("id")
      .eq("token_id", tokenId)
      .eq("status", "draft")
      .single();
    if (findError && findError.code !== "PGRST116") throw findError;

    // 6) Update ou insert
    if (existingDraft) {
      const { error: updateError } = await supabase
        .from("attestations")
        .update(fullPayload)
        .eq("id", existingDraft.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabase
        .from("attestations")
        .insert(fullPayload);
      if (insertError) throw new Error(insertError.message);
    }

    // 7) Nettoyage éventuel des autres drafts
    await supabase
      .from("attestations")
      .delete()
      .eq("token_id", tokenId)
      .eq("status", "draft");

    // 8) Marque le token utilisé
    const { error: tokenError } = await supabase
      .from("tokens")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", tokenId);
    if (tokenError) throw new Error(tokenError.message);

    // ─── Envoi automatique par mail ────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host:     process.env.EMAIL_HOST,
      port:     Number(process.env.EMAIL_PORT),
      secure:   process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      requireTLS: true,
    });

    await transporter.sendMail({
      from:       process.env.EMAIL_FROM,   // doit être ton EMAIL_USER ou un alias iCloud configuré
      to:         process.env.ADMIN_EMAIL,
      subject:    "Nouvelle attestation générée",
      text:       "Voici l’attestation générée automatiquement.",
      attachments: [
        {
          filename: fileName,
          content:  pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log("✅ Finalisé + mail envoyé. PDF URL:", pdfUrl);
    return NextResponse.json({ success: true, pdfUrl });
  } catch (error: any) {
    console.error("❌ Erreur finalize-attestation:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur inconnue" },
      { status: 500 }
    );
  }
}
