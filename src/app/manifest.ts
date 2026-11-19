import type { MetadataRoute } from "next";
import { PWA } from "@/lib/pwa/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: PWA.name,
    short_name: PWA.shortName,
    description: PWA.description,
    lang: PWA.lang,
    start_url: PWA.startUrl,
    scope: PWA.scope,
    display: "standalone",
    background_color: PWA.backgroundColor,
    theme_color: PWA.themeColor,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
