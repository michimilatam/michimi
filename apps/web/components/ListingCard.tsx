import Link from "next/link";
import { CONDITIONS, formatMoney, type Condition, type CurrencyCode } from "@michimi/core";
import { photoUrl } from "@/lib/photo";

export interface ListingCardData {
  id: string;
  title: string;
  price_amount: number;
  currency: CurrencyCode;
  condition: Condition;
  city: string;
  status: string;
  listing_photos: { path: string; position: number }[];
}

export function ListingCard({ l }: { l: ListingCardData }) {
  const cover = [...l.listing_photos].sort((a, b) => a.position - b.position)[0];
  return (
    <Link href={`/publicacion/${l.id}`} className="group block overflow-hidden rounded-card border border-line bg-card">
      <div className="relative aspect-square bg-line">
        {cover && <img src={photoUrl(cover.path)} alt="" className="h-full w-full object-cover" loading="lazy" />}
        {l.status === "reservada" && (
          <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-lima">Reservado</span>
        )}
      </div>
      <div className="p-3">
        <p className="text-lg font-bold tabular-nums">{formatMoney({ amount: l.price_amount, currency: l.currency })}</p>
        <p className="line-clamp-2 text-[15px] group-hover:underline">{l.title}</p>
        <p className="mt-1 text-xs text-ink-soft">{CONDITIONS[l.condition]} · {l.city}</p>
      </div>
    </Link>
  );
}
