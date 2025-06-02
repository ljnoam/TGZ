// app/layout.tsx

import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TGZ Conciergerie - Attestations de Service",
  description:
    "Plateforme interne pour la génération d'attestations de prestation de service",
  generator: "v0.dev",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-slate-900`}>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
