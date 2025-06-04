// app/admin/login/layout.tsx
import { ReactNode } from "react";

interface LoginLayoutProps {
  children: ReactNode;
}

export default function AdminLoginLayout({ children }: LoginLayoutProps) {
  // Ce layout n'applique **pas** la vérification du cookie ni la navbar d'Admin.
  // Il sert uniquement à rendre le contenu de /admin/login sans ré-intercepter dans AdminLayout.
  return <>{children}</>;
}
