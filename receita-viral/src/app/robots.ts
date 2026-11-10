import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/conta", "/planejador", "/compras", "/entrar", "/cadastro"] }],
    sitemap: appUrl("/sitemap.xml"),
  };
}
