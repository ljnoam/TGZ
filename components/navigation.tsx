"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Building2, Settings } from "lucide-react"

export default function Navigation() {
  const pathname = usePathname()

  // Ne pas afficher la navigation sur la page d'accueil
  if (pathname === "/") {
    return null
  }

  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center text-white hover:text-blue-400 transition-colors">
              <Building2 className="h-6 w-6 mr-2" />
              <span className="text-lg font-semibold">TGZ Conciergerie</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {pathname !== "/admin" && (
              <Link href="/admin">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-700">
                  <Settings className="mr-2 h-4 w-4" />
                  Administration
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
