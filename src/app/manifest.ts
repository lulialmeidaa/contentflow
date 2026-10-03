import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ContentFlow",
    short_name: "ContentFlow",
    description: "Organize suas ideias e saiba o que gravar hoje.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f6",
    theme_color: "#faf7f6",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
