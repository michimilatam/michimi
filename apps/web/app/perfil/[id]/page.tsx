import { notFound, permanentRedirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ProfileView } from "@/components/ProfileView";

export default async function Perfil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: p } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  if (p.is_store && p.store_slug) permanentRedirect(`/tienda/${p.store_slug}`);
  return <ProfileView p={p} />;
}
