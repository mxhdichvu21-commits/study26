import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Study26 - Dạy và học trực tuyến",
    short_name: "Study26",
    description: "Nền tảng dạy và học trực tuyến Study26.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fc",
    theme_color: "#2563eb",
    orientation: "portrait-primary",
    lang: "vi-VN",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
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
  };
}
