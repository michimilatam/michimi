import { supabaseServer } from "@/lib/supabase/server";
import { RoleReputation } from "@/components/Reputation";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { StoreBadge } from "@/components/StoreBadge";
import Link from "next/link";
import { EmailToggle } from "@/components/EmailToggle";
import { PushToggle } from "@/components/PushToggle";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ProfileView({ p }: { p: any }) {
  const id: string = p.id;
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const mine = auth.user?.id === id;
  const [{ data: rep }, { data: ratings }, { data: listings }] = await Promise.all([
    supabase.from("user_reputation").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("ratings").select("score,role,comment,created_at,rater:profiles!ratings_rater_id_fkey(display_name)").eq("ratee_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("listings").select("id,title,price_amount,price_type,currency,condition,city,status,listing_photos(path,thumb_path,position)").eq("seller_id", id).in("status", ["activa", "reservada"]).order("created_at", { ascending: false }),
  ]);
  const seller = (ratings ?? []).filter((r) => r.role === "seller");
  const buyer = (ratings ?? []).filter((r) => r.role === "buyer");

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-16 w-16 rounded-full" /> : <div className="h-16 w-16 rounded-full bg-line" />}
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">{p.display_name}{p.is_store && <StoreBadge label />}{p.professional_status === "verificado" && <VerifiedBadge label />}</h1>
          {p.profession && <p className="font-medium">{p.profession}</p>}
          <p className="text-sm text-ink-soft">
            {p.city ?? "Paraguay"} · En Michimi desde {new Date(p.created_at).toLocaleDateString("es-PY", { month: "long", year: "numeric" })}
            {p.phone_verified && " · Teléfono verificado"}
          </p>
        </div>
      </header>

      {p.is_store && (p.store_website || p.store_instagram || p.store_phone) && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {p.store_website && <a href={/^https?:/.test(p.store_website) ? p.store_website : `https://${p.store_website}`} target="_blank" rel="noopener noreferrer nofollow" className="underline">{String(p.store_website).replace(/^https?:\/\//, "")}</a>}
          {p.store_instagram && <a href={`https://instagram.com/${String(p.store_instagram).replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer nofollow" className="underline">@{String(p.store_instagram).replace(/^@/, "")}</a>}
          {p.store_phone && <span>{p.store_phone}</span>}
        </p>
      )}
      {mine && p.is_store && p.store_slug && <p className="text-sm text-ink-soft">Tu tienda: <Link href={`/tienda/${p.store_slug}`} className="underline">michimi.com/tienda/{p.store_slug}</Link> · <Link href="/tienda/mi-catalogo" className="underline">Revisar catálogo preparado</Link></p>}
      {p.bio && <p className="max-w-2xl whitespace-pre-line text-[15px]">{p.bio}</p>}
      {mine && <Link href="/perfil/editar" className="btn-ghost w-fit">Editar perfil</Link>}
      {mine && <PushToggle userId={id} />}
      {mine && <EmailToggle userId={id} initial={p.email_notifications ?? true} />}
      {mine && p.professional_status !== "verificado" && (
        <Link href="/verificacion" className="block rounded-card border border-line bg-card p-4 hover:border-ink">
          <p className="font-semibold">{p.professional_status === "pendiente" ? "Tu verificación está en revisión" : "Verificá tu identidad"}</p>
          <p className="text-sm text-ink-soft">{p.professional_status === "pendiente" ? "Te avisamos cuando esté lista. Suele tardar 1 a 3 días hábiles." : "Subí tu documento y te sumamos el sello azul de usuario verificado. Genera más confianza al comprar, vender u ofrecer servicios."}</p>
        </Link>
      )}
      <section className="grid gap-3 sm:grid-cols-2">
        <RoleReputation role="seller" scores={seller.map((r) => r.score)} completed={rep?.sales_completed ?? 0} />
        <RoleReputation role="buyer" scores={buyer.map((r) => r.score)} completed={rep?.purchases_completed ?? 0} />
      </section>
      <p className="text-xs text-ink-soft">Solo califican personas que completaron una operación con PIN de entrega. Las calificaciones se publican cuando ambos califican o a los 14 días.</p>

      {(ratings ?? []).some((r) => r.comment) && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Lo que dicen</h2>
          <ul className="space-y-2">
            {(ratings ?? []).filter((r) => r.comment).map((r, i) => (
              <li key={i} className="rounded-xl border border-line bg-card p-3 text-[15px]">
                <span className="font-semibold">{"★".repeat(r.score)}</span>
                <span className="ml-2 text-xs text-ink-soft">{r.role === "seller" ? "le compró" : "le vendió"} · {(r.rater as unknown as { display_name: string } | null)?.display_name}</span>
                <p>{r.comment}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">{p.is_store ? "Productos" : "Publicaciones activas"}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(listings as ListingCardData[] | null)?.map((l) => <ListingCard key={l.id} l={l} />)}
        </div>
      </section>
    </div>
  );
}
