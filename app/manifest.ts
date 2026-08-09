import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FitMate AI by Growsia",
    short_name: "FitMate AI",
    description:
      "FitMate AI by Growsia: workout adaptif, jogging GPS, jurnal nutrisi, progress tracking, dan panduan gerakan 2D.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#020617",
    theme_color: "#16a34a",
    categories: ["fitness", "health", "lifestyle"],
    lang: "id",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Mulai latihan",
        short_name: "Latihan",
        url: "/workout",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Catat makanan",
        short_name: "Nutrisi",
        url: "/nutrition",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Mulai jogging",
        short_name: "Jogging",
        url: "/jogging",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
