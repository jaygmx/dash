import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Excluded from the auth gate in middleware.ts
// so it's reachable for install. Icons are the PNG set in public/.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dash — an index of elsewhere",
    short_name: "Dash",
    description:
      "A handmade, card-catalogue dashboard for the bookmarks worth keeping.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2EDE3",
    theme_color: "#F2EDE3",
    icons: [
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
