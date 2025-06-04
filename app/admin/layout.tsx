// app/admin/layout.tsx
"use client";

import { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Ce layout n’affiche plus la navbar.
 * La logique de redirection vers /admin/login
 * est désormais gérée directement dans app/admin/page.tsx.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return <>{children}</>;
}
