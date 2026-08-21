import type { MetadataRoute } from "next";

/**
 * Makes the app installable, which is what the tablets run.
 *
 * Next serves this at /manifest.webmanifest and links it from every page, so
 * no <link rel="manifest"> is needed in the layout. The service worker
 * precaches that URL, so an installed tablet keeps its identity offline.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LIRA — Recomandări de cărți",
    short_name: "LIRA",
    description:
      "Completează chestionarul literar LIRA și primește recomandări de cărți personalizate.",

    // Installed windows open at the welcome page rather than wherever the
    // tablet was last left.
    start_url: "/",
    scope: "/",

    // No browser chrome: the tablet is handed to a reader, and an address bar
    // is one tap away from leaving the questionnaire.
    display: "standalone",

    lang: "ro",
    dir: "ltr",

    // Matches the page background, so the window chrome does not flash a
    // different colour while the app starts.
    background_color: "#ffffff",
    theme_color: "#ffffff",

    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Separate files: a maskable icon is padded so a launcher can crop it to
      // a circle or a squircle without clipping the mark.
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
