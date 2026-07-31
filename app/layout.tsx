import type { Metadata, Viewport } from "next";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Invisible Patient",
  description: "A mental health support system for dementia and brain injury caregivers.",
  applicationName: "The Invisible Patient",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Invisible Patient",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#002828",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F9FAF7]">
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
