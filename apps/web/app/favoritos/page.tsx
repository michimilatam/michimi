import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

export const metadata: Metadata = { title: "Favoritos" };

export default async function Favoritos() {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/ingresar?next=/favoritos");
  const { data } = await supabase.from("favorites")
    .select("created_at, l:listings(id,title,price_amount,price_type,currency,condition,city,region,status,listing_photos(path,thumb_path,position))")
    .eq("user_id", u.user.id).order("created_at", { ascending: false });
  const items = (data ?? []).map((x) => x.l as unknown as ListingCardData | null).filter((l): l is ListingCardData => !!l);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Favoritos</h1>
      {!items.length && <p className="rounded-card border border-dashed border-line p-10 text-center text-ink-soft">Tocá el ♥ en cualquier publicación para guardarla acá.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((l) => <ListingCard key={l.id} l={l} faved />)}
      </div>
    </div>
  );
}
