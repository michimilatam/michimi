import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/mensajes", "/operacion", "/mis-publicaciones", "/favoritos", "/busquedas", "/verificacion", "/auth", "/publicar", "/*/editar"] }],
    sitemap: "https://www.michimi.com/sitemap.xml",
    host: "https://www.michimi.com",
  };
}
