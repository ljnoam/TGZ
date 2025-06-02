"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Loader2, Building2 } from "lucide-react"
import { verifyToken } from "@/lib/auth"

export default function HomePage() {
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  // Vérifier si un code est passé en paramètre URL
  useEffect(() => {
    const codeFromUrl = searchParams.get("code")
    if (codeFromUrl) {
      setToken(codeFromUrl)
      // Auto-vérification si code dans l'URL
      handleSubmit(null, codeFromUrl)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent | null, codeFromUrl?: string) => {
    if (e) e.preventDefault()

    const codeToVerify = codeFromUrl || token.trim()
    if (!codeToVerify) return

    setLoading(true)
    setError("")

    try {
      const result = await verifyToken(codeToVerify)

      if (result.valid && result.tokenData) {
        // Stocker le token dans le sessionStorage
        sessionStorage.setItem("access_token", codeToVerify)
        sessionStorage.setItem("token_data", JSON.stringify(result.tokenData))

        // Rediriger vers le formulaire
        router.push("/formulaire")
      } else {
        setError(result.error || "Code d'accès invalide ou expiré")
      }
    } catch (err) {
      setError("Erreur de connexion. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header avec branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-blue-400 mr-3" />
            <h1 className="text-2xl font-bold text-white">TGZ Conciergerie</h1>
          </div>
          <p className="text-slate-400">Plateforme d'attestations de service</p>
        </div>

        {/* Formulaire d'accès */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto bg-slate-700 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-blue-400" />
            </div>
            <CardTitle className="text-xl text-white">Accès sécurisé</CardTitle>
            <p className="text-slate-400">Entrez votre code d'accès pour continuer</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="token" className="text-slate-300">
                  Code d'accès
                </Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="Entrez votre code"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  className="text-center text-lg tracking-wider bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400"
                  disabled={loading}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-400">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading || !token.trim()}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  "Accéder au formulaire"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
              <p>Vous n'avez pas de code d'accès ?</p>
              <p className="mt-1">Contactez votre administrateur TGZ.</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 text-sm">
          <p>© 2024 TGZ Conciergerie - Plateforme interne</p>
          <a
            href="https://www.tgzconciergerie.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            www.tgzconciergerie.com
          </a>
        </div>
      </div>
    </div>
  )
}
