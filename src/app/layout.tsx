import type { Metadata, Viewport } from "next";
import { Fraunces, Fredoka, Geist } from "next/font/google";
import { OfflineBanner } from "@/features/pwa/offline-banner";
import { SwRegister } from "@/features/pwa/sw-register";
import { PWA } from "@/lib/pwa/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: PWA.name,
  description: PWA.description,
  icons: { apple: PWA.appleTouchIcon },
  appleWebApp: { capable: true, title: PWA.shortName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: PWA.themeColor,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${fraunces.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <OfflineBanner />
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
