// lib/admin-auth.ts

/**
 * Vérifie si l’admin est connecté en regardant le cookie HTTP-only “admin_logged_in”.
 * (Cette fonction ne fonctionne que côté client.)
 */
export function checkAdminAuth(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("admin_logged_in=true");
}

export function logoutAdmin(): void {
  // Efface le cookie côté client (pour forcer un rafraîchissement et une redirection éventuelle)
  document.cookie = "admin_logged_in=; path=/; max-age=0; SameSite=Lax";
}
