import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatMoney, formatPrice, type CurrencyCode } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/photo";
import { ListingActions } from "./ListingActions";

export const metadata: Metadata = { title: "Mis publicaciones" };
const STATUS: Record<string, string> = { activa: "Activa", reservada: "Reservada", vendida: "Vendida", pausada: "Pausada" };

export default async function MisPublicaciones() {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/ingresar?next=/mis-publicaciones");
  const { data } = await supabase.from("listings")
    .select("id,title,kind,status,price_amount,price_type,currency,created_at,listing_photos(path,position)")
    .eq("seller_id", u.user.id).is("deleted_at", null).order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mis publicaciones</h1>
        <Link href="/publicar" className="btn-primary h-10 px-4 text-sm">Publicar</Link>
      </header>
      {!data?.length && <p className="rounded-card border border-dashed border-line p-10 text-center text-ink-soft">Todavía no publicaste nada.</p>}
      <ul className="divide-y divide-line rounded-card border border-line bg-card">
        {data?.map((l) => {
          const cover = [...l.listing_photos].sort((a, b) => a.position - b.position)[0]?.path;
          return (
            <li key={l.id} className="flex flex-wrap items-center gap-3 p-3">
              <Link href={`/publicacion/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-line">{cover && <img src={photoUrl(cover)} alt="" className="h-full w-full object-cover" />}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{l.title}</span>
                  <span className="block text-sm tabular-nums">{formatPrice({ priceType: l.price_type, amount: l.price_amount, currency: l.currency }, (a) => formatMoney({ amount: a, currency: l.currency as CurrencyCode }))}</span>
                  <span className="text-xs text-ink-soft">{l.kind === "servicio" ? "Servicio" : "Producto"} · {STATUS[l.status] ?? l.status}</span>
                </span>
              </Link>
              <ListingActions id={l.id} title={l.title} status={l.status} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
