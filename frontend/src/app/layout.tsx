import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "PsiKoç",
  description: "Türkçe AI duygusal destek asistanı",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="h-full bg-[#F7F5FF]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
