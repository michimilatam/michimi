import { supabaseServer } from "@/lib/supabase/server";
import { fetchShopifyCatalog } from "@/lib/catalog";

/** Admin: prepara el catálogo preliminar de una invitación leyendo la web pública del comercio. */
export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: ok } = await supabase.rpc("is_admin");
  if (!ok) return Response.json({ error: "No autorizado" }, { status: 403 });
  const { code } = (await req.json()) as { code: string };
  const { data: inv } = await supabase.from("store_invites").select("code,website").eq("code", code).single();
  if (!inv?.website) return Response.json({ error: "La invitación no tiene sitio web" }, { status: 400 });
  try {
    const items = await fetchShopifyCatalog(inv.website);
    if (!items.length) return Response.json({ error: "No se encontraron productos disponibles con foto" }, { status: 400 });
    const rows = items.map((p) => ({ ...p, invite_code: code }));
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from("store_products").upsert(rows.slice(i, i + 100), { onConflict: "invite_code,external_id", ignoreDuplicates: true });
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ count: items.length });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Error leyendo la web" }, { status: 502 });
  }
}
