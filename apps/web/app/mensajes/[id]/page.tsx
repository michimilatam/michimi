import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Chat } from "./Chat";

export default async function Conversacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data: c } = await supabase
    .from("conversations")
    .select("*, listing:listings(id,title,currency,price_amount,status,listing_photos(path,position)), buyer:profiles!conversations_buyer_id_fkey(id,display_name,avatar_url), seller:profiles!conversations_seller_id_fkey(id,display_name,avatar_url)")
    .eq("id", id)
    .maybeSingle();
  if (!c || !u.user) notFound();
  const [{ data: messages }, { data: offers }, { data: op }] = await Promise.all([
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at"),
    supabase.from("offers").select("*").eq("conversation_id", id),
    supabase.from("operations").select("id,status").eq("listing_id", c.listing.id).eq("buyer_id", c.buyer_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const imSeller = c.seller_id === u.user.id;
  const other = imSeller ? c.buyer : c.seller;
  const cover = [...(c.listing.listing_photos ?? [])].sort((a: { position: number }, b: { position: number }) => a.position - b.position)[0]?.path ?? null;
  return (
    <Chat
      key={id}
      me={u.user.id}
      role={imSeller ? "vendo" : "compro"}
      other={{ id: other.id, name: other.display_name, avatar: other.avatar_url }}
      conversation={{ id, buyerId: c.buyer_id, listing: { ...c.listing, cover } }}
      initialMessages={messages ?? []}
      initialOffers={offers ?? []}
      operation={op}
    />
  );
}
