import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dash — an index of elsewhere",
  description:
    "Dash — a handmade, card-catalogue dashboard for the bookmarks worth keeping.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2EDE3" },
    { media: "(prefers-color-scheme: dark)", color: "#14110F" },
  ],
};

// Apply theme + appearance (palette/font pair) before paint to avoid a flash.
// Both come from localStorage (source keys, unchanged), so first-time visitors
// see the built-in default until the cloud fetch in <Dashboard> resolves.
const NO_FLASH = `(function () {
  try {
    var t = localStorage.getItem("jay.portal.theme.v1");
    if (!t) {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (t === "dark") document.documentElement.classList.add("dark");

    var raw = localStorage.getItem("jay.portal.appearance.v1");
    if (raw) {
      var a = JSON.parse(raw);
      var THEMES = ["vermillion","ocean","forest","noir","terracotta"];
      var FONTS  = ["editorial","periodical","bauhaus","literary","industrial"];
      if (a && THEMES.indexOf(a.theme) >= 0) document.documentElement.setAttribute("data-theme", a.theme);
      if (a && FONTS.indexOf(a.font) >= 0) document.documentElement.setAttribute("data-font", a.font);
    }
  } catch (_) {}
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
