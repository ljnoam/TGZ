"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Save, CheckCircle, Eye } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ConfirmationPage from "@/components/confirmation-page";
import DocumentPreview from "@/components/document-preview";
import SupportLink from "@/components/support-link";
import { markTokenAsUsedAndDelete } from "@/lib/auth";
import SignaturePad from "@/components/signature-pad";
import AddressAutocomplete from "@/components/address-autocomplete";
import { generateAttestationPDF } from "@/lib/pdf-generator";

interface FormData {
  nom: string;
  prenom: string;
  adresse: string;
  type_prestation: "evenement_sportif" | "autre" | "";
  evenement?: string;
  court?: string;
  categorie?: string;
  autres_precisions?: string;
  prix: string;
  mode_paiement: "especes" | "virement" | "";
  rib?: string;
  signature?: string;
  ville: string;
  date: string;            // date de la prestation (identique à avant)
  // — nouvellement ajouté :
  eventDate: string;       // date de l’événement sportif
  tickets: string;         // nombre de places achetées
}

export default function FormulairePage() {
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [showPreview, setShowPreview] = useState(false);
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  const [formData, setFormData] = useState<FormData>({
    nom: "",
    prenom: "",
    adresse: "",
    type_prestation: "",
    prix: "",
    mode_paiement: "",
    ville: "",
    date: new Date().toISOString().split("T")[0],
    eventDate: new Date().toISOString().split("T")[0], // → initialisation par défaut
    tickets: "",                                       // → initialisation vide
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  // ─── Sauvegarde automatique toutes les 3 secondes ─────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (tokenData && (formData.nom || formData.prenom || formData.adresse)) {
        saveData(true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [formData, tokenData]);

  // ─── Récupérer token_client au chargement ───────────────────────────────────────
  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    const storedTokenData = sessionStorage.getItem("token_data");

    if (!token || !storedTokenData) {
      router.push("/");
      return;
    }

    try {
      const parsedTokenData = JSON.parse(storedTokenData);
      setTokenData(parsedTokenData);
      loadExistingData(parsedTokenData.id);
    } catch (err) {
      router.push("/");
      return;
    }

    setLoading(false);
    loadEvents();
  }, [router]);

  // ─── Charger la liste des événements (Roland, etc.) ────────────────────────────
  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Erreur chargement événements:", error);
    }
  };

  // ─── Charger d’éventuelles données déjà enregistrées (draft) ──────────────────
  const loadExistingData = async (tokenId: string) => {
    try {
      const { data, error } = await supabase
        .from("attestations")
        .select("*")
        .eq("token_id", tokenId)
        .eq("status", "draft")
        .single();
      if (data && !error) {
        const loadedData: FormData = {
          nom: data.prestataire_nom || "",
          prenom: data.prestataire_prenom || "",
          adresse: data.prestataire_adresse || "",
          type_prestation: data.prestation_description?.includes("Roland-Garros")
            ? ("evenement_sportif" as const)
            : ("autre" as const),
          prix: data.prestation_montant?.toString() || "",
          mode_paiement: "" as const,
          ville: data.prestation_lieu || "",
          date:
            data.prestation_date_debut ||
            new Date().toISOString().split("T")[0],
          eventDate:
            // ↪︎ Si l’admin a pré-rempli un champ eventDate dans prestation_description,
            // on tente de l’extraire, sinon default = today.
            data.prestation_description && data.prestation_description.includes("DateEvt:")
              ? data.prestation_description
                  .split("DateEvt:")[1]
                  .split(" | ")[0]
                  .trim()
                  .split(" ")[0]
              : new Date().toISOString().split("T")[0],
          tickets:
            data.prestation_description && data.prestation_description.includes("Tickets:")
              ? data.prestation_description
                  .split("Tickets:")[1]
                  .trim()
                  .split(" ")[0]
              : "",
        };

        if (
          loadedData.type_prestation === "evenement_sportif" &&
          data.prestation_description
        ) {
          // On extrait l’ID de l’événement (Roland-Garros)
          loadedData.evenement = events.find(
            (e) => e.name === "Roland-Garros"
          )?.id;
          const parts = data.prestation_description.split(" - ");
          if (parts.length >= 3) {
            loadedData.court = parts[1]?.toLowerCase().replace(" ", "-");
            loadedData.categorie = parts[2]?.toLowerCase().replace(" ", "-");
            loadedData.autres_precisions = parts.slice(3).join(" - ");
          }
        } else {
          loadedData.autres_precisions = data.prestation_description || "";
        }

        setFormData(loadedData);
      }
    } catch (err) {
      console.log("Aucune donnée existante trouvée");
      // On part du principe qu’un draft a été créé par l’admin, donc s’il n’y a pas de draft, c’est que l’admin n’a pas généré le token… (flux impossible)
    }
  };

  // ─── saveData : ON NE FAIT PLUS D’INSERT BRUT, car la ligne existe déjà en “draft” ───
  const saveData = async (silent = false) => {
    if (!tokenData) return;

    if (!silent) {
      setSaving(true);
      setSaveStatus("saving");
    }

    try {
      // 1. Construit description de l’événement + nombre de places
      let evenementNom = "";
      if (
        formData.type_prestation === "evenement_sportif" &&
        formData.evenement
      ) {
        const foundEvent = events.find((e) => e.id === formData.evenement);
        evenementNom = foundEvent ? foundEvent.name : "";
      }

      // On stocke tout dans prestation_description séparé par “ - ”.
      // Pour pouvoir ré-extraire plus tard (dans loadExistingData), on ajoute un prefix “DateEvt:YYYY-MM-DD | Tickets:N”
      const descriptionParts: string[] = [];
      if (formData.type_prestation === "evenement_sportif") {
        descriptionParts.push(evenementNom);
        if (formData.court) descriptionParts.push(formData.court);
        if (formData.categorie) descriptionParts.push(formData.categorie);
        if (formData.autres_precisions) descriptionParts.push(formData.autres_precisions);
        // On ajoute toujours dateEv et tickets au tout début :
        descriptionParts.unshift(`DateEvt:${formData.eventDate} | Tickets:${formData.tickets}`);
      } else {
        // prestation “autre”
        if (formData.autres_precisions) descriptionParts.push(formData.autres_precisions);
        // On ajoute quand même dateEv et tickets pour conserver cohérence :
        descriptionParts.unshift(`DateEvt:${formData.eventDate} | Tickets:${formData.tickets}`);
      }

      const fullDescription = descriptionParts.join(" - ");

      // 2. Prépare le payload de mise à jour (status = "draft")
      const attestationData = {
        token_id: tokenData.id,
        client_id: tokenData.client_id,
        prestataire_nom: formData.nom,
        prestataire_prenom: formData.prenom,
        prestataire_adresse: formData.adresse,
        prestataire_email: tokenData.email || "",
        client_nom: "TGZ Conciergerie",
        client_adresse: "4 rue de sontay, 75116 Paris",
        prestation_description: fullDescription,
        prestation_date_debut: formData.date,
        prestation_date_fin: formData.date,
        prestation_montant: Number.parseFloat(formData.prix) || 0,
        prestation_lieu: formData.ville,
        status: "draft",
      };

      // 3. On essaye d’updater le draft existant (il a forcément été créé par l’admin).
      const { data: existingDraft, error: findError } = await supabase
        .from("attestations")
        .select("id")
        .eq("token_id", tokenData.id)
        .eq("status", "draft")
        .single();

      if (existingDraft) {
        // 3a. Mise à jour du brouillon
        const { error: updateError } = await supabase
          .from("attestations")
          .update({ ...attestationData, updated_at: new Date().toISOString() })
          .eq("id", existingDraft.id);

        if (updateError) throw updateError;
      } else {
        // 3b. (Cas *théorique* où l’admin n’a pas créé de brouillon → on ré-insère quand même)
        const { error: insertError } = await supabase
          .from("attestations")
          .insert(attestationData);
        if (insertError) throw insertError;
      }

      if (!silent) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    } catch (error) {
      console.error("Erreur de sauvegarde :", error);
      if (!silent) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } finally {
      if (!silent) {
        setSaving(false);
      }
    }
  };

  // ─── finalizeAttestation (identique à la version précédente) ─────────────────────
  const finalizeAttestation = async () => {
    if (!tokenData) return;

    setFinalizing(true);
    setSaveStatus("saving");

    try {
      // On sauvegarde une dernière fois en “draft” avant PDF
      await saveData();

      // Préparer pdfData avec le nom de l’événement
      let evenementNom = "";
      if (
        formData.type_prestation === "evenement_sportif" &&
        formData.evenement
      ) {
        const foundEvent = events.find((e) => e.id === formData.evenement);
        evenementNom = foundEvent ? foundEvent.name : "";
      }

      const pdfData = {
        ...formData,
        evenement: evenementNom,
      };

      // Générer PDF
      const pdf = generateAttestationPDF(pdfData);
      const pdfBlob = pdf.output("blob");

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const response = await fetch("/api/finalize-attestation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tokenId: tokenData.id,
              attestationData: pdfData,
              pdfBase64: reader.result,
            }),
          });

          const result = await response.json();

          if (result.success) {
            // Marquer le token utilisé & supprimer la session
            await markTokenAsUsedAndDelete(tokenData.id);

            setPdfUrl(result.pdfUrl);
            setIsCompleted(true);
            setSaveStatus("saved");

            sessionStorage.removeItem("access_token");
            sessionStorage.removeItem("token_data");
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          console.error("Erreur finalisation :", error);
          setSaveStatus("error");
        } finally {
          setFinalizing(false);
        }
      };
      reader.readAsDataURL(pdfBlob);
    } catch (error) {
      console.error("Erreur génération PDF :", error);
      setSaveStatus("error");
      setFinalizing(false);
    }
  };

  const downloadPDF = () => {
    let evenementNom = "";
    if (
      formData.type_prestation === "evenement_sportif" &&
      formData.evenement
    ) {
      const foundEvent = events.find((e) => e.id === formData.evenement);
      evenementNom = foundEvent ? foundEvent.name : "";
    }
    const pdfData = { ...formData, evenement: evenementNom };
    const pdf = generateAttestationPDF(pdfData);
    pdf.save(`attestation_${formData.nom}_${formData.prenom}.pdf`);
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      saveData();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isCompleted) {
    return <ConfirmationPage pdfUrl={pdfUrl} onDownload={downloadPDF} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-lg text-white">Chargement...</p>
        </div>
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="min-h-screen bg-slate-900 py-4 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setShowPreview(false)}
              className="mb-4 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Retour au formulaire
            </Button>
          </div>
          <DocumentPreview formData={formData} />
          <div className="mt-8 text-center">
            <Button
              onClick={() => setShowPreview(false)}
              size="lg"
              className="text-lg px-8 py-4 bg-blue-600 hover:bg-blue-700"
            >
              Continuer vers la signature
            </Button>
          </div>
        </div>
        <SupportLink />
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-center text-white">
              Votre identité
            </h2>
            <div>
              <Label
                htmlFor="nom"
                className="text-lg font-medium text-slate-300"
              >
                Nom *
              </Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => updateFormData("nom", e.target.value)}
                placeholder="Votre nom de famille"
                className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                required
              />
            </div>
            <div>
              <Label
                htmlFor="prenom"
                className="text-lg font-medium text-slate-300"
              >
                Prénom *
              </Label>
              <Input
                id="prenom"
                value={formData.prenom}
                onChange={(e) => updateFormData("prenom", e.target.value)}
                placeholder="Votre prénom"
                className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                required
              />
            </div>
            <AddressAutocomplete
              value={formData.adresse}
              onChange={(value) => updateFormData("adresse", value)}
              placeholder="Commencez à taper votre adresse..."
              label="Adresse complète"
              required
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-center text-white">
              Type de prestation
            </h2>
            <div>
              <Label className="text-lg font-medium text-slate-300">
                Type de prestation *
              </Label>
              <RadioGroup
                value={formData.type_prestation}
                onValueChange={(value) =>
                  updateFormData("type_prestation", value)
                }
                className="mt-4 space-y-4"
              >
                <div className="flex items-center space-x-3 p-4 border border-slate-600 rounded-lg hover:bg-slate-700 bg-slate-800">
                  <RadioGroupItem
                    value="evenement_sportif"
                    id="evenement"
                    className="w-5 h-5"
                  />
                  <Label
                    htmlFor="evenement"
                    className="text-lg cursor-pointer flex-1 text-white"
                  >
                    Événement sportif
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border border-slate-600 rounded-lg hover:bg-slate-700 bg-slate-800">
                  <RadioGroupItem value="autre" id="autre" className="w-5 h-5" />
                  <Label
                    htmlFor="autre"
                    className="text-lg cursor-pointer flex-1 text-white"
                  >
                    Autre
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {formData.type_prestation === "evenement_sportif" && (
              <>
                <div>
                  <Label
                    htmlFor="evenement"
                    className="text-lg font-medium text-slate-300"
                  >
                    Événement
                  </Label>
                  <Select
                    value={formData.evenement}
                    onValueChange={(value) =>
                      updateFormData("evenement", value)
                    }
                  >
                    <SelectTrigger className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Sélectionner un événement" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {events.map((event) => (
                        <SelectItem
                          key={event.id}
                          value={event.id}
                          className="text-lg py-3 text-white"
                        >
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.evenement && (
                  <div>
                    <Label
                      htmlFor="court"
                      className="text-lg font-medium text-slate-300"
                    >
                      Court
                    </Label>
                    <Select
                      value={formData.court}
                      onValueChange={(value) =>
                        updateFormData("court", value)
                      }
                    >
                      <SelectTrigger className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Sélectionner un court" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {events
                          .find((e) => e.id === formData.evenement)
                          ?.courts?.map((court: string) => (
                            <SelectItem
                              key={court}
                              value={court}
                              className="text-lg py-3 text-white"
                            >
                              {court}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.evenement && (
                  <div>
                    <Label
                      htmlFor="categorie"
                      className="text-lg font-medium text-slate-300"
                    >
                      Catégorie
                    </Label>
                    <Select
                      value={formData.categorie}
                      onValueChange={(value) =>
                        updateFormData("categorie", value)
                      }
                    >
                      <SelectTrigger className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {events
                          .find((e) => e.id === formData.evenement)
                          ?.categories?.map((category: string) => (
                            <SelectItem
                              key={category}
                              value={category}
                              className="text-lg py-3 text-white"
                            >
                              {category}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div>
              <Label
                htmlFor="precisions"
                className="text-lg font-medium text-slate-300"
              >
                Autres précisions
              </Label>
              <Textarea
                id="precisions"
                value={formData.autres_precisions}
                onChange={(e) =>
                  updateFormData("autres_precisions", e.target.value)
                }
                placeholder="Détails supplémentaires sur la prestation"
                className="text-lg py-4 mt-2 min-h-[100px] bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            {/* ─── NOUVEAU : Date de l’événement ───────────────────────────────────── */}
            <div>
              <Label
                htmlFor="eventDate"
                className="text-lg font-medium text-slate-300"
              >
                Date de l'événement *
              </Label>
              <Input
                id="eventDate"
                type="date"
                value={formData.eventDate}
                onChange={(e) => updateFormData("eventDate", e.target.value)}
                className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>

            {/* ─── NOUVEAU : Nombre de places achetées ─────────────────────────────── */}
            <div>
              <Label
                htmlFor="tickets"
                className="text-lg font-medium text-slate-300"
              >
                Nombre de places (acheté) *
              </Label>
              <Input
                id="tickets"
                type="number"
                min="1"
                step="1"
                value={formData.tickets}
                onChange={(e) => updateFormData("tickets", e.target.value)}
                placeholder="0"
                className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                required
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-center text-white">
              Paiement
            </h2>
            <div>
              <Label
                htmlFor="prix"
                className="text-lg font-medium text-slate-300"
              >
                Prix (€) *
              </Label>
              <Input
                id="prix"
                type="number"
                step="0.01"
                value={formData.prix}
                onChange={(e) => updateFormData("prix", e.target.value)}
                placeholder="0.00"
                className="text-xl py-4 mt-2 text-center font-bold bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                required
              />
            </div>
            <div>
              <Label className="text-lg font-medium text-slate-300">
                Mode de paiement *
              </Label>
              <RadioGroup
                value={formData.mode_paiement}
                onValueChange={(value) => updateFormData("mode_paiement", value)}
                className="mt-4 space-y-4"
              >
                <div className="flex items-center space-x-3 p-4 border border-slate-600 rounded-lg hover:bg-slate-700 bg-slate-800">
                  <RadioGroupItem value="especes" id="especes" className="w-5 h-5" />
                  <Label
                    htmlFor="especes"
                    className="text-lg cursor-pointer flex-1 text-white"
                  >
                    Espèces
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border border-slate-600 rounded-lg hover:bg-slate-700 bg-slate-800">
                  <RadioGroupItem value="virement" id="virement" className="w-5 h-5" />
                  <Label
                    htmlFor="virement"
                    className="text-lg cursor-pointer flex-1 text-white"
                  >
                    Virement
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {formData.mode_paiement === "virement" && (
              <div>
                <Label htmlFor="rib" className="text-lg font-medium text-slate-300">
                  RIB *
                </Label>
                <Input
                  id="rib"
                  value={formData.rib}
                  onChange={(e) => updateFormData("rib", e.target.value)}
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                  className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  required
                />
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2 text-white">
                Aperçu de votre attestation
              </h2>
              <p className="text-slate-400">
                Vérifiez vos informations avant de signer
              </p>
            </div>

            <Button
              onClick={() => setShowPreview(true)}
              variant="outline"
              size="lg"
              className="w-full text-lg py-4 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <Eye className="mr-2 h-5 w-5" />
              Voir l'aperçu du document
            </Button>

            <div className="border-t border-slate-600 pt-6">
              <h3 className="text-xl font-bold mb-4 text-center text-white">
                Votre signature
              </h3>
              <SignaturePad
                value={formData.signature}
                onChange={(signature) => updateFormData("signature", signature)}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-center text-white">
              Lieu et date
            </h2>
            <div>
              <Label htmlFor="ville" className="text-lg font-medium text-slate-300">
                Ville *
              </Label>
              <Input
                id="ville"
                value={formData.ville}
                onChange={(e) => updateFormData("ville", e.target.value)}
                placeholder="Ville de la prestation"
                className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                required
              />
            </div>
            <div>
              <Label htmlFor="date" className="text-lg font-medium text-slate-300">
                Date de la prestation *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => updateFormData("date", e.target.value)}
                className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.nom && formData.prenom && formData.adresse;
      case 2:
        return (
          formData.type_prestation !== "" &&
          formData.eventDate !== "" &&
          formData.tickets !== ""
        );
      case 3:
        return (
          formData.prix &&
          formData.mode_paiement &&
          (formData.mode_paiement === "especes" || formData.rib)
        );
      case 4:
        return formData.signature !== undefined;
      case 5:
        return formData.ville && formData.date;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-4 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <Button
              variant="ghost"
              className="mb-4 text-lg py-3 px-4 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Retour
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            Attestation de Prestation
          </h1>
          <p className="text-lg text-slate-400 text-center">
            Étape {currentStep} sur {totalSteps}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progress} className="h-3 bg-slate-700" />
          <div className="flex justify-between text-sm text-slate-400 mt-2">
            <span>Identité</span>
            <span>Prestation</span>
            <span>Paiement</span>
            <span>Signature</span>
            <span>Finaliser</span>
          </div>
        </div>

        {/* Save Status */}
        {saveStatus !== "idle" && (
          <Alert
            className={`mb-6 ${
              saveStatus === "saved"
                ? "bg-green-900/20 border-green-800 text-green-400"
                : saveStatus === "error"
                ? "bg-red-900/20 border-red-800 text-red-400"
                : "bg-blue-900/20 border-blue-800 text-blue-400"
            }`}
          >
            <div className="flex items-center">
              {saveStatus === "saving" && (
                <Save className="h-5 w-5 animate-spin mr-2" />
              )}
              {saveStatus === "saved" && (
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              )}
              <AlertDescription className="text-lg">
                {saveStatus === "saving" && "Sauvegarde en cours..."}
                {saveStatus === "saved" &&
                  "✅ Données sauvegardées automatiquement"}
                {saveStatus === "error" && "❌ Erreur de sauvegarde"}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Form */}
        <Card className="shadow-lg bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">
              Étape {currentStep} / {totalSteps}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">{renderStep()}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex-1 py-4 text-lg border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            size="lg"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Précédent
          </Button>

          {currentStep < totalSteps ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={!isStepValid() || saving}
              className="flex-1 py-4 text-lg bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              Suivant
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={finalizeAttestation}
              disabled={!isStepValid() || finalizing}
              className="flex-1 py-4 text-lg bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {finalizing ? "Génération..." : "🎉 Finaliser"}
            </Button>
          )}
        </div>

        {/* Support Link */}
        <SupportLink />
      </div>
    </div>
  );
}
