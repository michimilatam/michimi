import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { PublicarForm, type EditListing } from "@/app/publicar/PublicarForm";

export const metadata: Metadata = { title: "Editar publicación" };

export default async function Editar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect(`/ingresar?next=/publicacion/${id}/editar`);
  const { data: l } = await supabase.from("listings").select("*, photos:listing_photos(id,path,position)").eq("id", id).maybeSingle();
  const { data: can } = l ? await supabase.rpc("can_manage_listing", { p_listing: id }) : { data: false };
  if (!l || !can) notFound();
  l.photos.sort((a: { position: number }, b: { position: number }) => a.position - b.position);
  return <PublicarForm initialCountry={l.country} edit={l as EditListing} />;
}
