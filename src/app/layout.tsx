import type { Metadata, Viewport } from "next";
import { Unbounded, Inter } from "next/font/google";
import { CelebrationToast } from "@/components/CelebrationToast";
import { IOSActiveFix } from "@/components/IOSActiveFix";
import { OnboardingGate } from "@/components/OnboardingGate";
import { RemoteSync } from "@/components/RemoteSync";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { StoreHydrator } from "@/components/StoreHydrator";
import "./globals.css";

// Both support Cyrillic — required since the whole UI is in Russian.
const display = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

// Next doesn't auto-prefix manually-specified metadata URLs with
// `basePath` (unlike next/link or next/image), so this is done by hand —
// see next.config.js for where NEXT_PUBLIC_BASE_PATH comes from.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Family Hub",
  description: "Наша семья — общие задачи, баллы и награды",
  manifest: `${base}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Family Hub",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF3D94",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <body className="paper-texture min-h-dvh bg-paper font-body text-ink">
        <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-paper pt-[env(safe-area-inset-top)]">
          <OnboardingGate>{children}</OnboardingGate>
        </div>
        <CelebrationToast />
        <IOSActiveFix />
        <ServiceWorkerRegister />
        <StoreHydrator />
        <RemoteSync />
      </body>
    </html>
  );
}
