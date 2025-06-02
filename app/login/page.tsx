"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { verifyToken } from "@/lib/auth"
import { Loader2, Lock } from "lucide-react"

export default function LoginPage() {
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await verifyToken(token.trim())

      if (result.valid && result.tokenData) {
        // Stocker le token dans le sessionStorage pour la session
        sessionStorage.setItem("access_token", token.trim())
        sessionStorage.setItem("token_data", JSON.stringify(result.tokenData))

        // Rediriger vers le formulaire
        router.push("/formulaire")
      } else {
        setError(result.error || "Code d'accès invalide")
      }
    } catch (err) {
      setError("Erreur de connexion. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Accès sécurisé</CardTitle>
          <CardDescription>Entrez votre code d'accès temporaire pour continuer</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Code d'accès"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="text-center text-lg tracking-wider"
                disabled={loading}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading || !token.trim()}>
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

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Vous n'avez pas de code d'accès ?</p>
            <p className="mt-1">Contactez votre administrateur.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
