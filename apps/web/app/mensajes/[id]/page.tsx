import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Chat } from "./Chat";

export default async function Conversacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data: c } = await supabase
    .from("conversations")
    .select("*, listing:listings(id,title,kind,currency,price_amount,status,listing_photos(path,position)),request:service_requests(id,title,status,currency), buyer:profiles!conversations_buyer_id_fkey(id,display_name,avatar_url,professional_status), seller:profiles!conversations_seller_id_fkey(id,display_name,avatar_url,professional_status)")
    .eq("id", id)
    .maybeSingle();
  if (!c || !u.user) notFound();
  const [{ data: messages }, { data: offers }, { data: op }] = await Promise.all([
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at"),
    supabase.from("offers").select("*").eq("conversation_id", id),
    (c.listing ? supabase.from("operations").select("id,status").eq("listing_id", c.listing.id) : supabase.from("operations").select("id,status").eq("request_id", c.request.id)).eq("buyer_id", c.buyer_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const imSeller = c.seller_id === u.user.id;
  const other = imSeller ? c.buyer : c.seller;
  const subject = c.listing ?? { id: c.request.id, title: `Pedido: ${c.request.title}`, currency: c.request.currency ?? "PYG", price_amount: null, status: c.request.status === "abierto" ? "activa" : "reservada", listing_photos: [], href: `/pedidos/${c.request.id}` };
  const cover = [...(subject.listing_photos ?? [])].sort((a: { position: number }, b: { position: number }) => a.position - b.position)[0]?.path ?? null;
  return (
    <Chat
      key={id}
      me={u.user.id}
      role={imSeller ? "vendo" : "compro"}
      other={{ id: other.id, name: other.display_name, avatar: other.avatar_url, verified: other.professional_status === "verificado" }}
      conversation={{ id, buyerId: c.buyer_id, listing: { ...subject, cover } }}
      initialMessages={messages ?? []}
      initialOffers={offers ?? []}
      operation={op}
      service={!c.listing || c.listing.kind === "servicio"}
    />
  );
}
