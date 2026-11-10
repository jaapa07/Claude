import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Receita Viral",
    short_name: "Receita Viral",
    description: "Receitas virais, populares e do mundo todo. Planeje a semana e gere listas de compras.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fffaf3",
    theme_color: "#f2600c",
    lang: "pt-BR",
    categories: ["food", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Chef IA", url: "/chef" },
      { name: "Planejador", url: "/planejador" },
      { name: "Listas de compras", url: "/compras" },
    ],
  };
}
