import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ConversationList, type ProductGroup } from "./ConversationList";

type Row = {
  id: string; buyer_id: string; seller_id: string; created_at: string;
  listing: { id: string; title: string; status: string; listing_photos: { path: string; position: number }[] } | null;
  request: { id: string; title: string; status: string } | null;
  buyer: { display_name: string; avatar_url: string | null } | null;
  seller: { display_name: string; avatar_url: string | null } | null;
};

/** Bandeja de mensajes: a la izquierda las conversaciones agrupadas por producto, a la derecha el chat. */
export default async function MensajesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/ingresar?next=/mensajes");
  const me = u.user.id;

  const { data: convs } = await supabase
    .from("conversations")
    .select("id,buyer_id,seller_id,created_at,listing:listings(id,title,status,listing_photos(path,position)),request:service_requests(id,title,status),buyer:profiles!conversations_buyer_id_fkey(display_name,avatar_url),seller:profiles!conversations_seller_id_fkey(display_name,avatar_url)")
    .limit(200);
  const rows = (convs as unknown as Row[] | null) ?? [];
  const ids = rows.map((r) => r.id);

  const [{ data: msgs }, { data: unread }] = await Promise.all([
    ids.length
      ? supabase.from("messages").select("conversation_id,body,kind,sender_id,created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(1000)
      : Promise.resolve({ data: [] as { conversation_id: string; body: string; kind: string; sender_id: string | null; created_at: string }[] }),
    supabase.rpc("unread_counts"),
  ]);

  const last = new Map<string, { body: string; kind: string; mine: boolean; at: string }>();
  for (const m of msgs ?? []) {
    if (!last.has(m.conversation_id)) last.set(m.conversation_id, { body: m.body, kind: m.kind, mine: m.sender_id === me, at: m.created_at });
  }
  const unreadBy = new Map(((unread as { conversation_id: string; unread: number }[] | null) ?? []).map((r) => [r.conversation_id, Number(r.unread)]));

  // Agrupar por producto. Un vendedor puede tener varias conversaciones (una por interesado) en el mismo producto.
  const groups = new Map<string, ProductGroup>();
  for (const r of rows) {
    const subject = r.listing ?? (r.request ? { ...r.request, listing_photos: [] } : null);
    if (!subject) continue;
    const key = r.listing ? r.listing.id : `pedido-${r.request!.id}`;
    const imSeller = r.seller_id === me;
    const other = imSeller ? r.buyer : r.seller;
    const l = last.get(r.id);
    const cover = [...subject.listing_photos].sort((a, b) => a.position - b.position)[0]?.path ?? null;
    const g = groups.get(key) ?? {
      listingId: key, title: r.request ? `Pedido: ${subject.title}` : subject.title, status: subject.status, cover, role: imSeller ? "vendo" : "compro",
      lastAt: "", unread: 0, conversations: [],
    };
    const item = {
      id: r.id,
      otherName: other?.display_name ?? "Usuario",
      otherAvatar: other?.avatar_url ?? null,
      preview: l ? (l.kind === "oferta" ? `${l.mine ? "Vos" : other?.display_name ?? "Usuario"}: hizo una oferta` : l.kind === "sistema" ? l.body : `${l.mine ? "Vos" : other?.display_name ?? "Usuario"}: ${l.body}`) : `${other?.display_name ?? "Usuario"} · sin mensajes todavía`,
      at: l?.at ?? r.created_at,
      unread: unreadBy.get(r.id) ?? 0,
    };
    g.conversations.push(item);
    g.unread += item.unread;
    if (item.at > g.lastAt) g.lastAt = item.at;
    groups.set(key, g);
  }
  const list = [...groups.values()]
    .map((g) => ({ ...g, conversations: g.conversations.sort((a, b) => b.at.localeCompare(a.at)) }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));

  return (
    <div className="-mx-4 -my-6 grid h-[calc(100dvh-4rem)] md:grid-cols-[340px_1fr]">
      <ConversationList groups={list} me={me} />
      <section className="min-h-0 min-w-0 bg-paper">{children}</section>
    </div>
  );
}
