import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { CATEGORIES, CONDITIONS, subcategoryLabel, formatMoney, formatPrice, summarize, BADGE_LABEL, type CategorySlug, type Condition, type CurrencyCode } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/photo";
import { ContactButtons } from "./ContactButtons";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ShareButtons } from "@/components/ShareButtons";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ReportButton } from "@/components/ReportButton";

type P = Promise<{ id: string }>;
type SP = Promise<{ fotos_fallidas?: string }>;

async function load(id: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("listings")
    .select("*, listing_photos(path,position), seller:profiles!listings_seller_id_fkey(id,display_name,avatar_url,created_at,last_active_at,profession,professional_status)")
    .eq("id", id)
    .maybeSingle();
  return { supabase, l: data };
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { l } = await load((await params).id);
  if (!l) return {};
  const cover = [...(l.listing_photos ?? [])].sort((a: { position: number }, b: { position: number }) => a.position - b.position)[0];
  const price = formatPrice({ priceType: l.price_type, amount: l.price_amount, currency: l.currency }, (a) => formatMoney({ amount: a, currency: l.currency as CurrencyCode }));
  const where = [l.city, l.region].filter(Boolean).join(", ");
  const title = `${l.title} – ${price} en ${l.city}`;
  const description = `${l.title} en ${where}. ${price}. ${(l.description || "").slice(0, 110)} Contactá ${l.kind === "servicio" ? "al profesional" : "al vendedor"} por chat en Michimi.`.trim();
  return { title, description, alternates: { canonical: `/publicacion/${l.id}` },
    robots: l.status === "pausada" ? { index: false } : undefined,
    openGraph: { title, description, ...(cover ? { images: [photoUrl(cover.path)] } : {}) } };
}

export default async function Publicacion({ params, searchParams }: { params: P; searchParams: SP }) {
  const { id } = await params;
  const { fotos_fallidas } = await searchParams;
  const { supabase, l } = await load(id);
  if (!l) notFound();
  const { data: auth } = await supabase.auth.getUser();
  const { data: rep } = await supabase.from("user_reputation").select("*").eq("user_id", l.seller.id).maybeSingle();
  const { data: sellerRatings } = await supabase.from("ratings").select("score").eq("ratee_id", l.seller.id).eq("role", "seller");
  const r = summarize((sellerRatings ?? []).map((x) => x.score));
  const photos = [...l.listing_photos].sort((a: { position: number }, b: { position: number }) => a.position - b.position);
  const attrs = Object.entries((l.attributes ?? {}) as Record<string, string>);
  const isOwner = auth.user?.id === l.seller_id;
  const svc = l.kind === "servicio";
  const { data: fav } = auth.user ? await supabase.from("favorites").select("listing_id").eq("user_id", auth.user.id).eq("listing_id", l.id).maybeSingle() : { data: null };
  const days = Math.floor((Date.now() - new Date(l.availability_confirmed_at).getTime()) / 86_400_000);

  return (
    <article className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(svc ? {
        "@context": "https://schema.org", "@type": "Service", name: l.title, description: l.description || l.title,
        serviceType: subcategoryLabel(l.category, l.subcategory) ?? "Servicio",
        areaServed: (l.coverage_regions?.length ? l.coverage_regions : [l.region ?? l.city]).map((a: string) => ({ "@type": "AdministrativeArea", name: a })),
        provider: { "@type": "Person", name: l.seller.display_name },
        ...(photos[0] ? { image: photos.map((p: { path: string }) => photoUrl(p.path)) } : {}),
        ...(l.price_amount ? { offers: { "@type": "Offer", price: (l.price_amount / 10 ** (l.currency === "PYG" ? 0 : 2)).toString(), priceCurrency: l.currency } } : {}),
      } : {
        "@context": "https://schema.org", "@type": "Product", name: l.title, description: l.description || l.title,
        category: subcategoryLabel(l.category, l.subcategory) ?? CATEGORIES[l.category as CategorySlug]?.label,
        ...(photos[0] ? { image: photos.map((p: { path: string }) => photoUrl(p.path)) } : {}),
        offers: { "@type": "Offer", url: `https://www.michimi.com/publicacion/${l.id}`, price: ((l.price_amount ?? 0) / 10 ** (l.currency === "PYG" ? 0 : 2)).toString(), priceCurrency: l.currency,
          itemCondition: l.condition === "nuevo" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
          availability: l.status === "activa" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
          areaServed: l.city, seller: { "@type": "Person", name: l.seller.display_name } },
      }) }} />
      <div className="grid grid-cols-2 gap-2 content-start">
        {fotos_fallidas && <p className="col-span-2 rounded-xl bg-warn/10 p-3 text-sm text-warn">La publicación se creó, pero {fotos_fallidas} foto(s) no se pudieron subir.</p>}
        {photos.length === 0 && <div className="col-span-2 flex aspect-[4/3] items-center justify-center rounded-xl bg-line text-ink-soft">Sin fotos todavía</div>}
        {photos.map((p: { path: string }, i: number) => (
          <img key={p.path} src={photoUrl(p.path)} alt={`${l.title} — foto ${i + 1}`} className={`w-full rounded-xl object-cover ${i === 0 ? "col-span-2 aspect-[4/3]" : "aspect-square"}`} />
        ))}
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-sm text-ink-soft">{CATEGORIES[l.category as CategorySlug]?.label}{subcategoryLabel(l.category, l.subcategory) ? ` › ${subcategoryLabel(l.category, l.subcategory)}` : ""} · {l.city}{l.region ? `, ${l.region}` : ""}</p>
          <div className="flex items-start justify-between gap-3"><h1 className="text-2xl font-bold">{l.title}</h1>{!isOwner && <FavoriteButton listingId={l.id} initial={!!fav} loggedIn={!!auth.user} />}</div>
          <p className="mt-2 text-3xl font-bold tabular-nums">{formatPrice({ priceType: l.price_type, amount: l.price_amount, currency: l.currency }, (a) => formatMoney({ amount: a, currency: l.currency as CurrencyCode }))}</p>
          <p className="mt-1 text-sm">
            {!svc && <span className="rounded-full bg-ink px-2 py-0.5 text-lima">{CONDITIONS[l.condition as Condition]}</span>}
            <span className="ml-2 text-ink-soft">Disponibilidad confirmada {days === 0 ? "hoy" : `hace ${days} días`}</span>
          </p>
        </div>

        {/* Publicación transparente: qué afirma, qué demuestra, qué falta verificar */}
        {svc ? (
        <section className="rounded-card border border-line bg-card p-4 text-[15px]">
          <h2 className="font-semibold">El servicio</h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-ink-soft">Atiende en</dt><dd>{(l.coverage_regions?.length ? l.coverage_regions : [l.region ?? l.city]).join(", ")}</dd>
            {l.schedule && (<><dt className="text-ink-soft">Horario</dt><dd>{l.schedule}</dd></>)}
            <dt className="text-ink-soft">Trabajos</dt><dd>{rep?.sales_completed ?? 0} completados en Michimi</dd>
          </dl>
          <p className="mt-3 text-sm text-ink-soft">Acordá el precio por chat. Cuando aceptes el presupuesto, recibís un PIN: dáselo al profesional solo cuando el trabajo esté terminado.</p>
        </section>
        ) : (
        <section className="rounded-card border border-line bg-card p-4 text-[15px]">
          <h2 className="font-semibold">Ficha</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {attrs.map(([k, v]) => (<Fragment key={k}><dt className="text-ink-soft capitalize">{k.replace("_", " ")}</dt><dd>{v}</dd></Fragment>))}
            <dt className="text-ink-soft">Fotos</dt><dd>{photos.length} ángulos</dd>
            {l.accessories && (<><dt className="text-ink-soft">Incluye</dt><dd>{l.accessories}</dd></>)}
          </dl>
          <p className="mt-3 text-sm"><b>Defectos declarados:</b> {l.defects || "El vendedor no declaró defectos."}</p>
        </section>
        )}

        <ContactButtons service={svc} listingId={l.id} currency={l.currency} price={l.price_amount} isOwner={isOwner} loggedIn={!!auth.user} status={l.status} />

        {isOwner && <Link href={`/publicacion/${l.id}/editar`} className="btn-ghost w-full">Editar publicación</Link>}
        <ShareButtons path={`/publicacion/${l.id}`} title={l.title} />
        {!isOwner && <ReportButton listingId={l.id} sellerId={l.seller_id} loggedIn={!!auth.user} />}

        <Link href={`/perfil/${l.seller.id}`} className="flex items-center gap-3 rounded-card border border-line bg-card p-4">
          {l.seller.avatar_url ? <img src={l.seller.avatar_url} alt="" className="h-12 w-12 rounded-full" /> : <div className="h-12 w-12 rounded-full bg-line" />}
          <div>
            <p className="flex items-center gap-1.5 font-semibold">{l.seller.display_name}{l.seller.professional_status === "verificado" && <VerifiedBadge label />}</p>
            {svc && l.seller.profession && <p className="text-sm">{l.seller.profession}</p>}
            <p className="text-sm text-ink-soft">
              {svc ? "Profesional" : "Vendedor"}: {r.count ? `${r.score.toFixed(1)}★` : "sin calificaciones"} · {BADGE_LABEL[r.badge]} · {rep?.sales_completed ?? 0} {svc ? "trabajos" : "ventas"}
            </p>
            <p className="text-xs text-ink-soft">En Michimi desde {new Date(l.seller.created_at).toLocaleDateString("es-PY", { month: "long", year: "numeric" })}</p>
          </div>
        </Link>

        {l.description && <section>
          <h2 className="font-semibold">Descripción</h2>
          <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{l.description}</p>
        </section>}
      </div>
    </article>
  );
}
