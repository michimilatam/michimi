import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Mensajes() {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("conversations")
    .select("id,buyer_id,listing:listings(title),buyer:profiles!conversations_buyer_id_fkey(display_name),seller:profiles!conversations_seller_id_fkey(display_name)")
    .order("created_at", { ascending: false });
  const { data: unread } = await supabase.rpc("unread_counts");
  const unreadBy = new Map(((unread as { conversation_id: string; unread: number }[] | null) ?? []).map((r) => [r.conversation_id, Number(r.unread)]));
  type Row = { id: string; buyer_id: string; listing: { title: string } | null; buyer: { display_name: string } | null; seller: { display_name: string } | null };
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Mensajes</h1>
      {!data?.length && <p className="text-ink-soft">Cuando consultes o hagas una oferta, la conversación aparece acá.</p>}
      <ul className="divide-y divide-line rounded-card border border-line bg-card">
        {(data as unknown as Row[] | null)?.map((c) => {
          const imBuyer = c.buyer_id === u.user?.id;
          const n = unreadBy.get(c.id) ?? 0;
          return (
            <li key={c.id}>
              <Link href={`/mensajes/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-paper">
                <div className="min-w-0 flex-1">
                <p className={n ? "font-bold" : "font-semibold"}>{c.listing?.title}</p>
                <p className="text-sm text-ink-soft">{imBuyer ? `Vende ${c.seller?.display_name}` : `Interesado: ${c.buyer?.display_name}`}</p>
                </div>
                {n > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-lima px-1.5 text-xs font-bold text-ink" aria-label={`${n} sin leer`}>{n}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
