import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { CatalogReview, type Draft } from "./CatalogReview";
import { myStores } from "@/lib/stores";

export const metadata: Metadata = { title: "Revisá tu catálogo", robots: { index: false } };

export default async function MiCatalogo() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/ingresar?next=/tienda/mi-catalogo");
  const stores = await myStores(supabase, auth.user.id);
  if (!stores.length) redirect("/");
  const { data: invites } = await supabase.from("store_invites").select("code,store_id").in("store_id", stores.map((s) => s.id));
  const codes = (invites ?? []).map((i) => i.code);
  const storeId = invites?.[0]?.store_id ?? stores[0]!.id;
  const store = stores.find((s) => s.id === storeId)!;
  const { data: sd } = await supabase.from("stores").select("city,region").eq("id", store.id).single();
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
          No tenés productos pendientes de revisar. <Link href={`/tienda/${store.slug}`} className="underline">Ver mi tienda</Link> · <Link href={`/publicar?comercio=${store.slug}`} className="underline">Publicar uno nuevo</Link>
        </div>
      ) : (
        <CatalogReview items={items as Draft[]} userId={auth.user.id} storeId={store.id} city={sd?.city ?? "Asunción"} region={sd?.region ?? null} slug={store.slug} />
      )}
    </div>
  );
}
