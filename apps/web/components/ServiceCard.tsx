import Link from "next/link";
import { formatMoney, formatPrice, subcategoryLabel, type CurrencyCode } from "@michimi/core";
import { photoUrl } from "@/lib/photo";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export interface ServiceCardData {
  id: string;
  title: string;
  price_amount: number | null;
  price_type: string;
  currency: CurrencyCode;
  city: string;
  region: string | null;
  seller_id: string;
  subcategory: string | null;
  coverage_regions: string[];
  listing_photos: { path: string; position: number }[];
  seller: { display_name: string; avatar_url: string | null; profession: string | null; professional_status: string } | null;
}

/** Tarjeta de profesional: lo que se contrata es la persona, así que la persona va primero. */
export function ServiceCard({ l, rep }: { l: ServiceCardData; rep?: { avg: number | null; count: number; done: number } }) {
  const cover = [...l.listing_photos].sort((a, b) => a.position - b.position)[0];
  const s = l.seller;
  const zones = l.coverage_regions.length ? l.coverage_regions : [l.region ?? l.city];
  return (
    <Link href={`/publicacion/${l.id}`} className="group flex flex-col overflow-hidden rounded-card border border-line bg-card hover:border-ink">
      <div className="flex items-center gap-3 p-4">
        {s?.avatar_url
          ? <img src={s.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" referrerPolicy="no-referrer" />
          : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-xl font-bold text-lima">{(s?.display_name[0] ?? "U").toUpperCase()}</span>}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold">{s?.display_name}{s?.professional_status === "verificado" && <VerifiedBadge />}</p>
          <p className="truncate text-sm text-ink-soft">{s?.profession || subcategoryLabel("servicios", l.subcategory) || "Servicio"}</p>
          <p className="text-sm">
            {rep?.count ? <><b>★ {rep.avg?.toFixed(1)}</b> <span className="text-ink-soft">({rep.count}) · {rep.done} trabajos</span></> : <span className="text-ink-soft">Nuevo en Michimi</span>}
          </p>
        </div>
      </div>
      {cover && <img src={photoUrl(cover.path)} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />}
      <div className="mt-auto space-y-1 p-4 pt-3">
        <p className="line-clamp-2 text-[15px] group-hover:underline">{l.title}</p>
        <p className="font-bold tabular-nums">{formatPrice({ priceType: l.price_type, amount: l.price_amount, currency: l.currency }, (a) => formatMoney({ amount: a, currency: l.currency }))}</p>
        <p className="truncate text-xs text-ink-soft">Atiende en {zones.join(", ")}</p>
      </div>
    </Link>
  );
}
