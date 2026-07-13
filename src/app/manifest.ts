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
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
