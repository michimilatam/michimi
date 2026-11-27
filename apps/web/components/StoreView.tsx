import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { RoleReputation } from "@/components/Reputation";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { StoreBadge } from "@/components/StoreBadge";

export type Store = {
  id: string; slug: string; name: string; bio: string | null; avatar_url: string | null; website: string | null;
  instagram: string | null; phone: string | null; city: string | null; created_at: string;
};

export async function StoreView({ s }: { s: Store }) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const [{ data: listings }, { data: owner }, { data: member }] = await Promise.all([
    supabase.from("listings").select("id,title,price_amount,price_type,currency,condition,city,status,listing_photos(path,thumb_path,position)")
      .eq("store_id", s.id).in("status", ["activa", "reservada"]).order("created_at", { ascending: false }).limit(500),
    supabase.from("store_members").select("user_id").eq("store_id", s.id).eq("role", "dueño").maybeSingle(),
    auth.user ? supabase.from("store_members").select("role").eq("store_id", s.id).eq("user_id", auth.user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const ownerId = owner?.user_id as string | undefined;
  const [{ data: rep }, { data: ratings }] = ownerId
    ? await Promise.all([
        supabase.from("user_reputation").select("*").eq("user_id", ownerId).maybeSingle(),
        supabase.from("ratings").select("score,role").eq("ratee_id", ownerId).eq("role", "seller"),
      ])
    : [{ data: null }, { data: [] }];
  const web = s.website?.replace(/^https?:\/\//, "");
  const ig = s.instagram?.replace(/^@/, "");

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        {s.avatar_url
          ? <img src={s.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
          : <div className="grid h-16 w-16 place-items-center rounded-full bg-ink text-2xl font-bold text-lima">{s.name.slice(0, 1)}</div>}
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">{s.name}<StoreBadge label /></h1>
          <p className="text-sm text-ink-soft">{s.city ?? "Paraguay"} · En Michimi desde {new Date(s.created_at).toLocaleDateString("es-PY", { month: "long", year: "numeric" })}</p>
          {(web || ig || s.phone) && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {web && <a href={`https://${web}`} target="_blank" rel="noopener noreferrer nofollow" className="underline">{web}</a>}
              {ig && <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer nofollow" className="underline">@{ig}</a>}
              {s.phone && <span>{s.phone}</span>}
            </p>
          )}
        </div>
      </header>
      {member && (
        <p className="flex flex-wrap gap-2">
          <Link href={`/tienda/${s.slug}/administrar`} className="btn-ghost w-fit">Administrar comercio</Link>
          <Link href={`/publicar?comercio=${s.slug}`} className="btn-primary w-fit">Publicar en el comercio</Link>
        </p>
      )}
      {s.bio && <p className="max-w-2xl whitespace-pre-line text-[15px]">{s.bio}</p>}
      <section className="max-w-md">
        <RoleReputation role="seller" scores={(ratings ?? []).map((r) => r.score)} completed={rep?.sales_completed ?? 0} />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Productos</h2>
        {!listings?.length && <p className="rounded-card border border-dashed border-line p-8 text-center text-ink-soft">Este comercio todavía no tiene publicaciones activas.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(listings as ListingCardData[] | null)?.map((l) => <ListingCard key={l.id} l={l} />)}
        </div>
      </section>
    </div>
  );
}
