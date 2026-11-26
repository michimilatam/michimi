import { supabaseServer } from "@/lib/supabase/server";

/**
 * Trae una foto del catálogo preliminar para que el dueño de la tienda la publique.
 * Solo sirve fotos de productos de SU propio catálogo (evita usarlo como proxy abierto).
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  const i = Number(u.searchParams.get("i") ?? 0);
  if (!id) return new Response("falta id", { status: 400 });
  const supabase = await supabaseServer();
  const { data: p } = await supabase.from("store_products").select("image_urls").eq("id", id).maybeSingle();
  const src = p?.image_urls?.[i];
  if (!src) return new Response("no encontrado", { status: 404 });
  const r = await fetch(src);
  if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) return new Response("no se pudo traer la foto", { status: 502 });
  return new Response(r.body, { headers: { "content-type": r.headers.get("content-type")!, "cache-control": "private, max-age=600" } });
}
