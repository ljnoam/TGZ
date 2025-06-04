// app/api/finalize-attestation/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { tokenId, attestationData, pdfBase64 } = await request.json();

    // 1. Convertir le base64 en Buffer
    const pdfBuffer = Buffer.from(pdfBase64.split(",")[1], "base64");

    // 2. Uploader le PDF vers Supabase Storage
    const fileName = `attestation_${tokenId}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("attestations")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadError) {
      throw new Error(`Erreur upload: ${uploadError.message}`);
    }

    // 3. Obtenir l'URL publique du PDF
    const { data: urlData } = supabase.storage
      .from("attestations")
      .getPublicUrl(fileName);
    const pdfUrl = urlData.publicUrl;

    // 4. Construire le payload pour passer l'attestation en "completed"
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
      prestation_date_debut:  attestationData.date,
      prestation_date_fin:    attestationData.date,
      prestation_montant:     Number.parseFloat(attestationData.prix) || 0,
      prestation_lieu:        attestationData.ville,
      status:                 "completed",
      pdf_generated:          true,
      pdf_url:                pdfUrl,
      sent_at:                new Date().toISOString(),
      updated_at:             new Date().toISOString(),
    };

    // 5. Rechercher **uniquement** le brouillon ("draft") pour ce token_id
    const { data: existingDraft, error: findError } = await supabase
      .from("attestations")
      .select("id")
      .eq("token_id", tokenId)
      .eq("status", "draft")
      .single();

    // Si findError.code === "PGRST116", cela signifie "aucune ligne trouvée" → on continuera vers INSERT.
    if (findError && findError.code !== "PGRST116") {
      throw findError;
    }

    if (existingDraft) {
      // 6a. Si on trouve un brouillon, on fait UN SEUL UPDATE de cette ligne en "completed"
      const { error: updateError } = await supabase
        .from("attestations")
        .update(fullPayload)
        .eq("id", existingDraft.id);
      if (updateError) {
        throw new Error(`Erreur mise à jour attestation : ${updateError.message}`);
      }
    } else {
      // 6b. Si on ne trouve aucun brouillon (c’est un cas théorique, 
      //     mais on le gère quand même), on fait un INSERT direct en "completed"
      const { data: insertData, error: insertError } = await supabase
        .from("attestations")
        .insert(fullPayload)
        .select("id");
      if (insertError) {
        throw new Error(`Erreur insertion attestation : ${insertError.message}`);
      }
    }

    // 7. (Optionnel) Nettoyage : supprimer **toute autre** attestation "draft" du même token_id 
    //    (au cas où il y en aurait eu plusieurs par mégarde, même si la logique devrait éviter ça).
    await supabase
      .from("attestations")
      .delete()
      .eq("token_id", tokenId)
      .eq("status", "draft");

    // 8. Marquer le token comme utilisé
    const { error: tokenError } = await supabase
      .from("tokens")
      .update({
        used:    true,
        used_at: new Date().toISOString(),
      })
      .eq("id", tokenId);
    if (tokenError) {
      throw new Error(`Erreur mise à jour token : ${tokenError.message}`);
    }

    console.log("✅ Attestation finalisée pour tokenId:", tokenId);
    console.log("📄 PDF accessible à :", pdfUrl);

    return NextResponse.json({
      success: true,
      pdfUrl,
      message: "Attestation finalisée avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur lors de la finalisation:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
