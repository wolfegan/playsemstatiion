import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Playsemstation",
  description: "Sua coleção pessoal de ROMs — joga sem estação.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
