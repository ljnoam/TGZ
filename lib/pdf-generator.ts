import jsPDF from "jspdf";

interface AttestationData {
  nom: string;
  prenom: string;
  adresse: string;
  type_prestation: string;
  evenement?: string;
  court?: string;
  categorie?: string;
  autres_precisions?: string;
  prix: string;
  mode_paiement: string;
  rib?: string;
  signature?: string;
  ville: string;
  date: string;       // date de la prestation
  eventDate: string;  // date de l'événement
  tickets: string;    // nombre de places achetées
}

export function generateAttestationPDF(data: AttestationData): jsPDF {
  const doc = new jsPDF();

  // Page dimensions & margins
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  let y = 30;

  // ─── HEADER ───────────────────────────────────────────────────────────────────
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("ATTESTATION DE PRESTATION DE SERVICE", pageWidth / 2, y, {
    align: "center",
  });

  y += 12;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Établie le ${new Date().toLocaleDateString("fr-FR")}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 20;

  // ─── PRESTATAIRE ─────────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PRESTATAIRE", margin, y);

  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  doc.text(`Nom : ${data.nom}`, margin, y);
  y += 6;
  doc.text(`Prénom : ${data.prenom}`, margin, y);
  y += 6;
  doc.text(`Adresse : ${data.adresse}`, margin, y);

  y += 16;

  // ─── DÉTAILS DE LA PRESTATION ────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DÉTAILS DE LA PRESTATION", margin, y);

  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  if (data.type_prestation === "evenement_sportif") {
    doc.text(`Événement : ${data.evenement || "N/A"}`, margin, y);
    y += 6;
    if (data.court) {
      doc.text(`Court : ${data.court}`, margin, y);
      y += 6;
    }
    if (data.categorie) {
      doc.text(`Catégorie : ${data.categorie}`, margin, y);
      y += 6;
    }
  }

  if (data.autres_precisions) {
    doc.text(`Description : ${data.autres_precisions}`, margin, y);
    y += 6;
  }

  // ─── NOUVEAU : Affiche la date de l’événement & nombre de places ─────────────
  doc.text(`Date de l'événement : ${new Date(data.eventDate).toLocaleDateString("fr-FR")}`, margin, y);
  y += 6;
  doc.text(`Nombre de places achetées : ${data.tickets}`, margin, y);
  y += 16;

  doc.text(`Lieu : ${data.ville}`, margin, y);
  y += 6;
  doc.text(`Date de prestation : ${new Date(data.date).toLocaleDateString("fr-FR")}`, margin, y);

  y += 16;

  // ─── PAIEMENT ─────────────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PAIEMENT", margin, y);

  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  doc.text(`Montant : ${data.prix} €`, margin, y);
  y += 6;
  doc.text(
    `Mode de paiement : ${
      data.mode_paiement === "especes" ? "Espèces" : "Virement"
    }`,
    margin,
    y
  );
  if (data.rib && data.mode_paiement === "virement") {
    y += 6;
    doc.text(`RIB : ${data.rib}`, margin, y);
  }

  y += 20;

  // ─── FAIT À / LE ──────────────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  const faitAtext = `Fait à : ${data.ville}    Le : ${new Date(
    data.date
  ).toLocaleDateString("fr-FR")}`;
  doc.text(faitAtext, margin, y);

  y += 20;

  // ─── SIGNATURES ──────────────────────────────────────────────────────────────
  // Prestataire signature block (left side)
  const sigBlockHeight = 40;
  const sigBlockWidth = 60;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Signature du prestataire :", margin, y);

  if (data.signature) {
    try {
      doc.addImage(data.signature, "PNG", margin, y + 6, sigBlockWidth, sigBlockHeight);
    } catch (e) {
      console.error("Erreur ajout signature prestataire:", e);
    }
  }
  // Draw a line under the signature area
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(
    margin,
    y + sigBlockHeight + 8,
    margin + sigBlockWidth,
    y + sigBlockHeight + 8
  );

  // Organiser / Admin signature block (right side)
  const adminX = pageWidth - margin - sigBlockWidth;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Signature de l'organisateur :", adminX, y, { align: "left" });

  // Put organiser’s fixed signature text / block
  const adminInfoY = y + 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const adminLines = [
    "TGZ S.A.S",
    "contact@tgz.events",
    "4 rue de sontay, 75016 Paris, France",
  ];
  adminLines.forEach((line, idx) => {
    doc.text(line, adminX, adminInfoY + idx * 6, { align: "left" });
  });

  // Draw a line under the organiser block
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(
    adminX,
    adminInfoY + adminLines.length * 6 + 4,
    adminX + sigBlockWidth,
    adminInfoY + adminLines.length * 6 + 4
  );

  y += sigBlockHeight + 20;

  // ─── FOOTER ───────────────────────────────────────────────────────────────────
  const footerY = pageHeight - 20;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    "TGZ S.A.S – contact@tgz.events – 4 rue de sontay, 75116 Paris, France",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  return doc;
}
