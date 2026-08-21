import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SessionProvider } from "@/lib/session";

// Global stylesheet, imported once at the root. It @imports variables,
// typography, layout, buttons and forms.
import "@/styles/global.css";

export const metadata: Metadata = {
  title: "LIRA — Recomandări de cărți",
  description:
    "Completează chestionarul literar LIRA și primește recomandări de cărți personalizate.",
  // The Vite index.html linked this explicitly; without it the browser falls
  // back to /favicon.ico, which this project does not ship.
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ro">
      <body>
        {/* Holds the questionnaire result across the client-side navigation
            from the questionnaire to /results, /email and /finish. */}
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
