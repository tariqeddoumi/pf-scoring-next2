// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Finance Scoring V5",
  description: "Workspace compact : client, projets, scoring, crédits et synthèse.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
