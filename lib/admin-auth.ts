// lib/admin-auth.ts

/**
 * Vérifie si l’administrateur est authentifié
 * en regardant le cookie HTTP-only "admin_logged_in".
 */
export function checkAdminAuth(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("admin_logged_in=true");
}

export function logoutAdmin(): void {
  // Expire le cookie HTTP-only côté client (accessible uniquement en JS pour déclencher redirect)
  document.cookie = "admin_logged_in=; path=/; max-age=0; SameSite=Lax";
}
