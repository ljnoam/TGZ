"use client"

import { MessageCircle } from "lucide-react"

export default function SupportLink() {
  const handleSupportClick = () => {
    const message = encodeURIComponent(
      "Bonjour, j'ai besoin d'aide pour remplir mon attestation de prestation de service. Pouvez-vous m'aider ?",
    )
    const whatsappUrl = `https://wa.me/33123456789?text=${message}`
    window.open(whatsappUrl, "_blank")
  }

  return (
    <button
      onClick={handleSupportClick}
      className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105 z-50"
      aria-label="Besoin d'aide ?"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="sr-only">Besoin d'aide ?</span>
    </button>
  )
}
