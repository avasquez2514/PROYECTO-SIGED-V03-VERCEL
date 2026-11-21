import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIGED - Despacho-B2B",
  description: "Sistema Integral de Gestión de Despacho",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192x192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192x192.png?v=2",
    shortcut: "/icon-192x192.png?v=2",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030712", // Soporte PWA
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/icon-192x192.png?v=2" />
        <link rel="apple-touch-icon" href="/icon-192x192.png?v=2" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning
        className={`
          antialiased
          bg-background-dark
          min-h-screen
        `}
      >
        {children}
        <div id="modal-root" />
      </body>
    </html>
  );
}
