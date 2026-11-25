import Link from "next/link";
import { CONDITIONS, formatMoney, formatPrice, type Condition, type CurrencyCode } from "@michimi/core";
import { photoUrl } from "@/lib/photo";
import { FavoriteButton } from "@/components/FavoriteButton";

export interface ListingCardData {
  id: string;
  title: string;
  price_amount: number | null;
  price_type?: string;
  currency: CurrencyCode;
  condition: Condition | null;
  city: string;
  region?: string | null;
  status: string;
  listing_photos: { path: string; position: number }[];
}

export function ListingCard({ l, faved }: { l: ListingCardData; faved?: boolean }) {
  const cover = [...l.listing_photos].sort((a, b) => a.position - b.position)[0];
  return (
    <Link href={`/publicacion/${l.id}`} className="group block overflow-hidden rounded-card border border-line bg-card">
      <div className="relative flex aspect-square items-center justify-center bg-line">
        {cover ? (
          <img src={photoUrl(cover.path)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-sm text-ink-soft">Sin fotos</span>
        )}
        {l.status === "reservada" && (
          <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-lima">Reservado</span>
        )}
        {faved !== undefined && <FavoriteButton listingId={l.id} initial={faved} className="absolute right-2 top-2" />}
      </div>
      <div className="p-3">
        <p className="text-lg font-bold tabular-nums">{formatPrice({ priceType: l.price_type, amount: l.price_amount, currency: l.currency }, (a) => formatMoney({ amount: a, currency: l.currency }))}</p>
        <p className="line-clamp-2 text-[15px] group-hover:underline">{l.title}</p>
        <p className="mt-1 text-xs text-ink-soft">{l.condition ? `${CONDITIONS[l.condition]} · ` : ""}{l.city}{l.region && l.region !== l.city ? `, ${l.region}` : ""}</p>
      </div>
    </Link>
  );
}
