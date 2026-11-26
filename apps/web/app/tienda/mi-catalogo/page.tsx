import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { CatalogReview, type Draft } from "./CatalogReview";

export const metadata: Metadata = { title: "Revisá tu catálogo", robots: { index: false } };

export default async function MiCatalogo() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/ingresar?next=/tienda/mi-catalogo");
  const { data: me } = await supabase.from("profiles").select("is_store,store_slug,city,region").eq("id", auth.user.id).single();
  if (!me?.is_store) redirect("/");
  const { data: invites } = await supabase.from("store_invites").select("code").eq("claimed_by", auth.user.id);
  const codes = (invites ?? []).map((i) => i.code);
  const { data: items } = codes.length
    ? await supabase.from("store_products").select("id,title,description,price_amount,currency,category,subcategory,image_urls,source_url").in("invite_code", codes).eq("status", "pendiente").order("created_at")
    : { data: [] };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Revisá tu catálogo</h1>
        <p className="text-[15px] text-ink-soft">Tomamos estos productos de tu web para ahorrarte la carga. Nadie los ve hasta que vos los publiques: revisá precio y descripción, elegí cuáles van y tocá Publicar.</p>
      </header>
      {!items?.length ? (
        <div className="rounded-card border border-dashed border-line p-8 text-center text-ink-soft">
          No tenés productos pendientes de revisar. <Link href={`/tienda/${me.store_slug}`} className="underline">Ver mi tienda</Link> · <Link href="/publicar" className="underline">Publicar uno nuevo</Link>
        </div>
      ) : (
        <CatalogReview items={items as Draft[]} userId={auth.user.id} city={me.city ?? "Asunción"} region={me.region ?? null} slug={me.store_slug!} />
      )}
    </div>
  );
}
