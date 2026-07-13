import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clash Tool – Upgrade-Planer",
    short_name: "Clash Tool",
    description:
      "Account-, Upgrade-, Builder- und Clan-Planung für Clash of Clans.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#fbbf24",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
