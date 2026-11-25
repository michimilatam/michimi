import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Chat } from "./Chat";

export default async function Conversacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data: c } = await supabase.from("conversations").select("*, listing:listings(id,title,currency,price_amount,status)").eq("id", id).maybeSingle();
  if (!c || !u.user) notFound();
  const [{ data: messages }, { data: offers }, { data: op }] = await Promise.all([
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at"),
    supabase.from("offers").select("*").eq("conversation_id", id),
    supabase.from("operations").select("id,status").eq("listing_id", c.listing.id).eq("buyer_id", c.buyer_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return (
    <Chat
      me={u.user.id}
      conversation={{ id, buyerId: c.buyer_id, listing: c.listing }}
      initialMessages={messages ?? []}
      initialOffers={offers ?? []}
      operation={op}
    />
  );
}
