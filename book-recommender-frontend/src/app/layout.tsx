import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SessionProvider } from "@/lib/session";
import OfflineSupport from "@/components/pwa/OfflineSupport";

// Global stylesheet, imported once at the root. It @imports variables,
// typography, layout, buttons and forms.
import "@/styles/global.css";

export const metadata: Metadata = {
  title: "LIRA — Recomandări de cărți",
  description:
    "Completează chestionarul literar LIRA și primește recomandări de cărți personalizate.",
  // The Vite index.html linked this explicitly; without it the browser falls
  // back to /favicon.ico, which this project does not ship.
  icons: {
    icon: "/favicon.svg",
    // iOS ignores the manifest icons when adding to the home screen.
    apple: "/icons/apple-touch-icon.png",
  },
  // Safari has no manifest support worth relying on, so the installed-app
  // behaviour is declared for it separately.
  appleWebApp: {
    capable: true,
    title: "LIRA",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Matches the manifest's theme_color so the installed window's chrome is the
  // same white as the page.
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ro">
      <body>
        {/* Registers the service worker, replays anything queued while there
            was no network, and shows the offline banner. */}
        <OfflineSupport />

        {/* Holds the questionnaire result across the client-side navigation
            from the questionnaire to /results, /email and /finish. */}
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
