import "./globals.css";

import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Qonvo",
  description: "AI-rolspel gesprekken voor training en onderwijs."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen bg-white text-zinc-900">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

