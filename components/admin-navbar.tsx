// components/admin-navbar.tsx
"use client";

import { useRouter } from "next/navigation";
import { logoutAdmin } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function AdminNavbar() {
  const router = useRouter();

  const handleLogout = async () => {
    // Appel à l'API qui efface le cookie HTTP-only
    await fetch("/api/logout", { method: "POST" });
    // On supprime aussi la trace côté client pour forcer le redirect
    logoutAdmin();
    router.replace("/admin/login");
  };

  return (
    <nav className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold">Dashboard Admin</h1>
      <Button
        size="sm"
        variant="outline"
        className="flex items-center gap-2"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Déconnexion
      </Button>
    </nav>
  );
}
