"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Download, Home, Mail, MessageCircle, Building2 } from "lucide-react"
import Link from "next/link"

interface ConfirmationPageProps {
  pdfUrl: string
  onDownload: () => void
}

export default function ConfirmationPage({ pdfUrl, onDownload }: ConfirmationPageProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center shadow-xl bg-slate-800 border-slate-700">
        <CardHeader className="pb-4">
          <div className="mx-auto bg-green-900/20 rounded-full w-20 h-20 flex items-center justify-center mb-6">
            <CheckCircle className="h-12 w-12 text-green-400" />
          </div>
          <CardTitle className="text-3xl text-green-400 mb-2">🎉 Attestation finalisée !</CardTitle>
          <p className="text-lg text-slate-300">Votre document a été généré avec succès</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-900/10 p-6 rounded-lg border border-green-800">
            <h3 className="font-semibold text-green-400 mb-3 text-lg">✅ Votre attestation est prête</h3>
            <div className="space-y-2 text-sm text-green-300">
              <div className="flex items-center justify-center">
                <Mail className="mr-2 h-4 w-4" />
                <span>Envoyée à TGZ Conciergerie</span>
              </div>
              <div className="flex items-center justify-center">
                <MessageCircle className="mr-2 h-4 w-4" />
                <span>Copie envoyée à votre email (si fourni)</span>
              </div>
              <div className="flex items-center justify-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                <span>Archivée en sécurité</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Button onClick={onDownload} size="lg" className="w-full text-lg py-4 bg-blue-600 hover:bg-blue-700">
              <Download className="mr-2 h-5 w-5" />📄 Télécharger mon attestation
            </Button>

            <Link href="/" className="block">
              <Button
                variant="outline"
                size="lg"
                className="w-full text-lg py-4 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <Home className="mr-2 h-5 w-5" />
                Retour à l'accueil
              </Button>
            </Link>
          </div>

          <div className="text-sm text-slate-400 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-center mb-2">
              <Building2 className="mr-2 h-4 w-4" />
              <span className="font-medium">TGZ Conciergerie</span>
            </div>
            <p>
              En cas de problème, contactez-nous :{" "}
              <a href="mailto:contact@tgzconciergerie.com" className="text-blue-400 underline">
                contact@tgzconciergerie.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
