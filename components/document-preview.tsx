"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Euro, User, Building } from "lucide-react";

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
  ville: string;
  date: string;
  eventDate: string;   // date de l’événement
  tickets: string;     // nombre de places achetées
}

interface DocumentPreviewProps {
  formData: FormData;
}

export default function DocumentPreview({ formData }: DocumentPreviewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getEventDescription = () => {
    if (formData.type_prestation === "evenement_sportif") {
      return `${formData.evenement || "Roland-Garros"} - ${
        formData.court
      } - ${formData.categorie}`;
    }
    return formData.autres_precisions || "Prestation de service";
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Aperçu de votre attestation
        </h2>
        <p className="text-gray-600">Vérifiez les informations avant de signer</p>
      </div>

      {/* Document simulé */}
      <Card className="bg-white shadow-lg border-2 border-gray-200">
        <CardHeader className="text-center bg-gray-50 border-b">
          <CardTitle className="text-xl font-bold text-gray-900">
            ATTESTATION DE PRESTATION DE SERVICE
          </CardTitle>
          <p className="text-sm text-gray-600">
            Établie le {new Date().toLocaleDateString("fr-FR")}
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Prestataire */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <User className="mr-2 h-5 w-5 text-blue-600" />
              PRESTATAIRE
            </h3>
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <p>
                <strong>Nom :</strong> {formData.nom}
              </p>
              <p>
                <strong>Prénom :</strong> {formData.prenom}
              </p>
              <p>
                <strong>Adresse :</strong> {formData.adresse}
              </p>
            </div>
          </div>

          {/* Prestation */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Building className="mr-2 h-5 w-5 text-green-600" />
              DÉTAILS DE LA PRÉSTATION
            </h3>
            <div className="bg-green-50 p-4 rounded-lg space-y-2">
              <p>
                <strong>Description :</strong> {getEventDescription()}
              </p>

              {/* ─── NOUVEAU : date de l’événement */}
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4 text-gray-500" />
                <span>
                  <strong>Date de l'événement :</strong>{" "}
                  {formatDate(formData.eventDate)}
                </span>
              </div>

              {/* ─── NOUVEAU : nombre de places */}
              <div className="flex items-center space-x-1">
                <Badge className="bg-blue-100 text-blue-800">Places :</Badge>
                <span>{formData.tickets}</span>
              </div>

              <div className="flex items-center">
                <MapPin className="mr-1 h-4 w-4 text-gray-500" />
                <span>
                  <strong>Lieu :</strong> {formData.ville}
                </span>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4 text-gray-500" />
                <span>
                  <strong>Date de prestation :</strong> {formatDate(formData.date)}
                </span>
              </div>
            </div>
          </div>

          {/* Paiement */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Euro className="mr-2 h-5 w-5 text-orange-600" />
              PAIEMENT
            </h3>
            <div className="bg-orange-50 p-4 rounded-lg space-y-2">
              <p>
                <strong>Montant :</strong>{" "}
                <span className="text-xl font-bold text-orange-600">
                  {formData.prix} €
                </span>
              </p>

              {/* ← remplacé <p> par <div> pour ne pas imbriquer Badge dans un <p> */}
              <div className="flex items-center space-x-2">
                <strong>Mode de paiement :</strong>
                <Badge variant="outline">
                  {formData.mode_paiement === "especes" ? "Espèces" : "Virement"}
                </Badge>
              </div>

              {formData.rib && formData.mode_paiement === "virement" && (
                <p>
                  <strong>RIB :</strong> {formData.rib}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t pt-4 text-center text-sm text-gray-500">
            <p>TGZ S.A.S – contact@tgz.events – 4 rue de sontay, 75116 Paris</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
