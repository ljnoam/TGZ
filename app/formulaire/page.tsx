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
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle,
  Eye,
  Trash2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ConfirmationPage from "@/components/confirmation-page";
import DocumentPreview from "@/components/document-preview";
import SupportLink from "@/components/support-link";
import { markTokenAsUsedAndDelete } from "@/lib/auth";
import SignaturePad from "@/components/signature-pad";
import AddressAutocomplete from "@/components/address-autocomplete";
import { generateAttestationPDF } from "@/lib/pdf-generator";

interface Lot {
  eventDate: string;
  court?: string;
  categorie?: string;
  tickets: string;
}

interface FormData {
  nom: string;
  prenom: string;
  adresse: string;
  type_prestation: "evenement_sportif" | "autre" | "";
  evenement?: string;
  lots: Lot[];
  autres_precisions?: string;
  prix: string;
  mode_paiement: "virement" | "";
  rib?: string;
  signature?: string;
  ville: string;
  date: string; // date de la prestation
}

export default function FormulairePage() {
  const router = useRouter();
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showPreview, setShowPreview] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState<FormData>({
    nom: "",
    prenom: "",
    adresse: "",
    type_prestation: "",
    evenement: undefined,
    lots: [{ eventDate: today, court: "", categorie: "", tickets: "" }],
    autres_precisions: "",
    prix: "",
    mode_paiement: "",
    rib: "",
    signature: undefined,
    ville: "",
    date: today,
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  // auto-save every 3s
  useEffect(() => {
    const iv = setInterval(() => {
      if (tokenData && (formData.nom || formData.prenom || formData.adresse)) {
        saveData(true);
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [formData, tokenData]);

  // load token + events
  useEffect(() => {
    const t = sessionStorage.getItem("access_token");
    const td = sessionStorage.getItem("token_data");
    if (!t || !td) return router.push("/");
    try {
      const parsed = JSON.parse(td);
      setTokenData(parsed);
      loadExistingData(parsed.id);
    } catch {
      return router.push("/");
    }
    setLoading(false);
    loadEvents();
  }, [router]);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("active", true)
      .order("name");
    if (error) console.error("Erreur chargement événements:", error);
    else setEvents(data || []);
  };

  // load existing draft (single lot)
  const loadExistingData = async (tokenId: string) => {
    try {
      const { data } = await supabase
        .from("attestations")
        .select("*")
        .eq("token_id", tokenId)
        .eq("status", "draft")
        .single();
      if (!data) return;
      // parse first lot
      const lot: Lot = {
        eventDate:
          data.prestation_description?.match(/DateEvt:([0-9\-]+)/)?.[1] || today,
        tickets: data.prestation_description?.match(/Tickets:([0-9]+)/)?.[1] || "",
        court: data.prestation_description?.split(" - ")[1]?.trim() || "",
        categorie: data.prestation_description?.split(" - ")[2]?.trim() || "",
      };
      setFormData((f) => ({
        ...f,
        nom: data.prestataire_nom || "",
        prenom: data.prestataire_prenom || "",
        adresse: data.prestataire_adresse || "",
        type_prestation: data.prestation_description?.includes("Roland-Garros")
          ? "evenement_sportif"
          : "autre",
        evenement: events.find((e) =>
          data.prestation_description.includes(e.name)
        )?.id,
        lots: [lot],
        autres_precisions:
          data.prestation_description?.split(" - ").slice(3).join(" - ") || "",
        prix: data.prestation_montant?.toString() || "",
        ville: data.prestation_lieu || "",
        date: data.prestation_date_debut || today,
      }));
    } catch {
      console.log("Aucune donnée existante trouvée");
    }
  };

  // helpers for lots
  const addLot = () =>
    setFormData((f) => ({
      ...f,
      lots: [...f.lots, { eventDate: today, court: "", categorie: "", tickets: "" }],
    }));
  const removeLot = (i: number) =>
    setFormData((f) => ({
      ...f,
      lots: f.lots.filter((_, idx) => idx !== i),
    }));
  const updateLot = (i: number, field: keyof Lot, value: string) =>
    setFormData((f) => ({
      ...f,
      lots: f.lots.map((lot, idx) =>
        idx === i ? { ...lot, [field]: value } : lot
      ),
    }));

  const saveData = async (silent = false) => {
    if (!tokenData) return;
    if (!silent) {
      setSaving(true);
      setSaveStatus("saving");
    }
    try {
      const eventName =
        formData.evenement &&
        events.find((e) => e.id === formData.evenement)?.name;
      // chaque lot => DateEvt... | Tickets... - EventName - court - categorie
      const descriptions = formData.lots.map((lot) => {
        const parts = [
          `DateEvt:${lot.eventDate} | Tickets:${lot.tickets}`,
          eventName,
          lot.court,
          lot.categorie,
        ].filter(Boolean);
        return parts.join(" - ");
      });
      if (formData.autres_precisions)
        descriptions.push(formData.autres_precisions);
      const fullDesc = descriptions.join(" || ");

      const payload = {
        token_id: tokenData.id,
        client_id: tokenData.client_id,
        prestataire_nom: formData.nom,
        prestataire_prenom: formData.prenom,
        prestataire_adresse: formData.adresse,
        prestataire_email: tokenData.email || "",
        client_nom: "TGZ Conciergerie",
        client_adresse: "4 rue de sontay, 75116 Paris",
        prestation_description: fullDesc,
        prestation_date_debut: formData.date,
        prestation_date_fin: formData.date,
        prestation_montant: parseFloat(formData.prix) || 0,
        prestation_lieu: formData.ville,
        status: "draft",
      };

      const { data: existing } = await supabase
        .from("attestations")
        .select("id")
        .eq("token_id", tokenData.id)
        .eq("status", "draft")
        .single();

      if (existing) {
        await supabase
          .from("attestations")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("attestations").insert(payload);
      }

      if (!silent) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    } catch (err) {
      console.error("Erreur de sauvegarde :", err);
      if (!silent) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const finalizeAttestation = async () => {
    if (!tokenData) return;
    setFinalizing(true);
    setSaveStatus("saving");
    try {
      await saveData();
      const eventName =
        formData.evenement &&
        events.find((e) => e.id === formData.evenement)?.name;
      const pdfData = { ...formData, evenement: eventName };
      const pdf = generateAttestationPDF(pdfData);
      const blob = pdf.output("blob");
      const reader = new FileReader();
      reader.onloadend = async () => {
        const res = await fetch("/api/finalize-attestation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenId: tokenData.id,
            attestationData: pdfData,
            pdfBase64: reader.result,
          }),
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        await markTokenAsUsedAndDelete(tokenData.id);
        setPdfUrl(result.pdfUrl);
        setIsCompleted(true);
        setSaveStatus("saved");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("token_data");
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Erreur finalisation :", err);
      setSaveStatus("error");
    } finally {
      setFinalizing(false);
    }
  };

  const downloadPDF = () => {
    const eventName =
      formData.evenement &&
      events.find((e) => e.id === formData.evenement)?.name;
    const pdfData = { ...formData, evenement: eventName };
    const pdf = generateAttestationPDF(pdfData);
    pdf.save(`attestation_${formData.nom}_${formData.prenom}.pdf`);
  };

  const updateFormData = (field: keyof FormData, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((s) => s + 1);
      saveData();
    }
  };
  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    );
  }

  if (isCompleted) {
    return <ConfirmationPage pdfUrl={pdfUrl} onDownload={downloadPDF} />;
  }

  if (showPreview) {
    return (
      <div className="min-h-screen bg-slate-900 py-4 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setShowPreview(false)}
            className="mb-4 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour au formulaire
          </Button>
          <DocumentPreview formData={formData} />
          <div className="mt-8 text-center">
            <Button
              onClick={() => setShowPreview(false)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4"
            >
              Continuer vers la signature
            </Button>
          </div>
        </div>
        <SupportLink />
      </div>
    );
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.nom && formData.prenom && formData.adresse;
      case 2:
        if (!formData.type_prestation) return false;
        if (formData.type_prestation === "evenement_sportif") {
          if (!formData.evenement) return false;
          return formData.lots.every(
            (l) => l.eventDate && l.court && l.categorie && l.tickets
          );
        }
        return true;
      case 3:
        return (
          formData.prix &&
          formData.mode_paiement === "virement" &&
          Boolean(formData.rib)
        );
      case 4:
        return formData.signature !== undefined;
      case 5:
        return formData.ville && formData.date;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-center text-white">
              Votre identité
            </h2>
            <div>
              <Label htmlFor="nom" className="text-lg font-medium text-slate-300">
                Nom *
              </Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => updateFormData("nom", e.target.value)}
                placeholder="Votre nom de famille"
                className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="prenom" className="text-lg font-medium text-slate-300">
                Prénom *
              </Label>
              <Input
                id="prenom"
                value={formData.prenom}
                onChange={(e) => updateFormData("prenom", e.target.value)}
                placeholder="Votre prénom"
                className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            <AddressAutocomplete
              value={formData.adresse}
              onChange={(v) => updateFormData("adresse", v)}
              placeholder="Commencez à taper votre adresse..."
              label="Adresse complète"
              className="mt-2"
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
                onValueChange={(v) => updateFormData("type_prestation", v)}
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
                  <Label className="text-lg font-medium text-slate-300">
                    Événement
                  </Label>
                  <Select
                    value={formData.evenement}
                    onValueChange={(v) => updateFormData("evenement", v)}
                  >
                    <SelectTrigger className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Sélectionner un événement" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {events.map((e) => (
                        <SelectItem key={e.id} value={e.id} className="text-lg py-3 text-white">
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="precisions" className="text-lg font-medium text-slate-300">
                    Autres précisions
                  </Label>
                  <Textarea
                    id="precisions"
                    value={formData.autres_precisions}
                    onChange={(e) => updateFormData("autres_precisions", e.target.value)}
                    placeholder="Détails supplémentaires sur la prestation"
                    className="text-lg py-4 mt-2 min-h-[100px] bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                {/* ─── Section Lots ─────────────────────────────────────────────────── */}
                <div>
                  <Label className="text-lg font-medium text-slate-300">
                    Lots
                  </Label>
                  <div className="space-y-4 mt-4">
                    {formData.lots.map((lot, idx) => (
                      <div
                        key={idx}
                        className="p-4 border border-slate-600 rounded-lg hover:bg-slate-700 bg-slate-800 space-y-4"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-medium text-white">
                            Lot #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-300 hover:text-white"
                            onClick={() => removeLot(idx)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>

                        <div>
                          <Label
                            htmlFor={`eventDate-${idx}`}
                            className="text-lg font-medium text-slate-300"
                          >
                            Date de l'événement *
                          </Label>
                          <Input
                            id={`eventDate-${idx}`}
                            type="date"
                            value={lot.eventDate}
                            onChange={(e) =>
                              updateLot(idx, "eventDate", e.target.value)
                            }
                            className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white"
                            required
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor={`court-${idx}`}
                            className="text-lg font-medium text-slate-300"
                          >
                            Court *
                          </Label>
                          <Select
                            value={lot.court}
                            onValueChange={(v) => updateLot(idx, "court", v)}
                          >
                            <SelectTrigger className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="Sélectionner un court" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              {events
                                .find((e) => e.id === formData.evenement)
                                ?.courts?.map((c: string) => (
                                  <SelectItem
                                    key={c}
                                    value={c}
                                    className="text-lg py-3 text-white"
                                  >
                                    {c}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor={`categorie-${idx}`}
                            className="text-lg font-medium text-slate-300"
                          >
                            Catégorie *
                          </Label>
                          <Select
                            value={lot.categorie}
                            onValueChange={(v) => updateLot(idx, "categorie", v)}
                          >
                            <SelectTrigger className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="Sélectionner une catégorie" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              {events
                                .find((e) => e.id === formData.evenement)
                                ?.categories?.map((cat: string) => (
                                  <SelectItem
                                    key={cat}
                                    value={cat}
                                    className="text-lg py-3 text-white"
                                  >
                                    {cat}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor={`tickets-${idx}`}
                            className="text-lg font-medium text-slate-300"
                          >
                            Nombre de places *
                          </Label>
                          <Input
                            id={`tickets-${idx}`}
                            type="number"
                            min="1"
                            step="1"
                            value={lot.tickets}
                            onChange={(e) =>
                              updateLot(idx, "tickets", e.target.value)
                            }
                            className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white"
                            required
                          />
                        </div>
                      </div>
                    ))}

                    <Button
                      onClick={addLot}
                      className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white text-lg"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Ajouter un lot
                    </Button>
                  </div>
                </div>
              </>
            )}

          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-center text-white">
              Paiement
            </h2>
            <div>
              <Label htmlFor="prix" className="text-lg font-medium text-slate-300">
                Prix (€) *
              </Label>
              <Input
                id="prix"
                type="number"
                step="0.01"
                value={formData.prix}
                onChange={(e) => updateFormData("prix", e.target.value)}
                placeholder="0.00"
                className="text-xl py-4 mt-2 text-center font-bold bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            <div>
              <Label className="text-lg font-medium text-slate-300">
                Mode de paiement *
              </Label>
              <RadioGroup
                value={formData.mode_paiement}
                onValueChange={(v) => updateFormData("mode_paiement", v)}
                className="mt-4 space-y-4"
              >
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
                  className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white"
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
                onChange={(sig) => updateFormData("signature", sig)}
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
                className="text-lg py-4 mt-2 bg-slate-700 border-slate-600 text-white"
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

  return (
    <div className="min-h-screen bg-slate-900 py-4 px-4">
      <div className="max-w-2xl mx-auto">
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

        <Card className="shadow-lg bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">
              Étape {currentStep} / {totalSteps}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">{renderStep()}</CardContent>
        </Card>

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

        <SupportLink />
      </div>
    </div>
  );
}
