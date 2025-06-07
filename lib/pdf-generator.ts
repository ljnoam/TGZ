import jsPDF from "jspdf";

interface Lot {
  eventDate: string;
  court?: string;
  categorie?: string;
  tickets: string;
}

interface AttestationData {
  nom: string;
  prenom: string;
  adresse: string;
  type_prestation: string;
  evenement?: string;
  lots: Lot[];
  autres_precisions?: string;
  prix: string;
  mode_paiement: string;
  rib?: string;
  signature?: string; // base64 PNG
  ville: string;
  date: string; // date de la prestation
}

export function generateAttestationPDF(data: AttestationData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const lineH = 14;
  let y = margin;

  // Espace réservé en bas pour cadres de signature + footer
  const reservedBottom = 160;

  // Saut de page automatique
  function ensureSpace(height: number) {
    if (y + height > pageH - reservedBottom) {
      doc.addPage();
      y = margin;
      renderHeader();
      y += 30;
    }
  }

  // ─── HEADER ───────────────────────────────────────────────────────────────────
  function renderHeader() {
    doc.setFont("helvetica", "bold").setFontSize(18);
    doc.text("ATTESTATION DE PRESTATION DE SERVICE", pageW / 2, y, { align: "center" });
    y += lineH;
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(`Établie le ${new Date().toLocaleDateString("fr-FR")}`, pageW / 2, y, {
      align: "center",
    });
  }
  renderHeader();
  y += 30;

  // ─── PRESTATAIRE ─────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("PRESTATAIRE", margin, y);
  y += lineH;
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Nom : ${data.nom}`, margin, y);
  y += lineH;
  doc.text(`Prénom : ${data.prenom}`, margin, y);
  y += lineH;
  doc.text(`Adresse : ${data.adresse}`, margin, y);
  y += 30;

  // ─── DÉTAILS DE LA PRESTATION ────────────────────────────────────────────────
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("DÉTAILS DE LA PRESTATION", margin, y);
  y += lineH * 1.2;
  doc.setFont("helvetica", "normal").setFontSize(10);

  if (data.type_prestation === "evenement_sportif") {
    doc.text(`Événement : ${data.evenement || "N/A"}`, margin, y);
    y += lineH * 1.5;
  }

  data.lots.forEach((lot, idx) => {
    ensureSpace(lineH * 5);
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text(`Lot ${idx + 1}`, margin, y);
    y += lineH;
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(
      `Date de l'événement : ${new Date(lot.eventDate).toLocaleDateString("fr-FR")}`,
      margin,
      y
    );
    y += lineH;
    if (lot.court) {
      doc.text(`Court : ${lot.court}`, margin, y);
      y += lineH;
    }
    if (lot.categorie) {
      doc.text(`Catégorie : ${lot.categorie}`, margin, y);
      y += lineH;
    }
    doc.text(`Nombre de places : ${lot.tickets}`, margin, y);
    y += lineH * 1.5;
  });

  if (data.autres_precisions) {
    ensureSpace(lineH * 2);
    doc.setFont("helvetica", "italic").setFontSize(10);
    doc.text(`Autres précisions : ${data.autres_precisions}`, margin, y);
    y += lineH * 2;
    doc.setFont("helvetica", "normal");
  }

  ensureSpace(lineH * 2);
  doc.text(`Lieu : ${data.ville}`, margin, y);
  y += lineH;
  doc.text(
    `Date de la prestation : ${new Date(data.date).toLocaleDateString("fr-FR")}`,
    margin,
    y
  );
  y += lineH * 2;

  // ─── PAIEMENT ────────────────────────────────────────────────────────────────
  ensureSpace(lineH * 4);
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("PAIEMENT", margin, y);
  y += lineH;
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Montant : ${data.prix} €`, margin, y);
  y += lineH;
  doc.text(
    `Mode de paiement : ${data.mode_paiement === "virement" ? "Virement" : "Espèces"}`,
    margin,
    y
  );
  if (data.mode_paiement === "virement" && data.rib) {
    y += lineH;
    doc.text(`RIB : ${data.rib}`, margin, y);
  }

  // ─── FAIT À / LE ──────────────────────────────────────────────────────────────
  y += lineH * 2;
  doc.setFont("helvetica", "italic").setFontSize(10);
  doc.text(
    `Fait à : ${data.ville}    Le : ${new Date(data.date).toLocaleDateString("fr-FR")}`,
    margin,
    y
  );

  // ─── SIGNATURES (fixées en bas) ──────────────────────────────────────────────
  const sigBlockW = 180;
  const sigBlockH = 50;
  const sigY = pageH - margin - sigBlockH - 60; // laisse de la place pour footer

  // === Signature Prestataire ===
  const leftX = margin;
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("Signature du prestataire :", leftX, sigY - 12);
  doc.setDrawColor(100);
  doc.setLineWidth(0.4);
  doc.rect(leftX, sigY, sigBlockW, sigBlockH);
  if (data.signature) {
    try {
      const imgW = sigBlockW - 10;
      const imgH = sigBlockH - 10;
      doc.addImage(data.signature, "PNG", leftX + 5, sigY + 5, imgW, imgH);
    } catch {
      // ignore
    }
  }

  // === Signature Organisateur ===
  const orgX = pageW - margin - sigBlockW;
  const orgCenterX = orgX + sigBlockW / 2;
  // Titre centré au-dessus
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("Signature de l'organisateur :", orgCenterX, sigY - 12, { align: "center" });
  // cadre
  doc.rect(orgX, sigY, sigBlockW, sigBlockH);
  // contenu centré à l'intérieur
  const lines = [
    "TGZ S.A.S",
    "contact@tgz.events",
    "4 rue de sontay, 75116 Paris, France",
  ];
  doc.setFont("helvetica", "normal").setFontSize(9);
  lines.forEach((line, i) => {
    doc.text(line, orgCenterX, sigY + 8 + i * lineH, { align: "center" });
  });

  // ─── FOOTER ───────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    "TGZ S.A.S – contact@tgz.events – 4 rue de sontay, 75116 Paris, France",
    pageW / 2,
    pageH - margin / 2,
    { align: "center" }
  );

  return doc;
}
