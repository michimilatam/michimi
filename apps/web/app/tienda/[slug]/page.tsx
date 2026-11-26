import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ProfileView } from "@/components/ProfileView";

type P = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("profiles").select("*").eq("store_slug", slug).eq("is_store", true).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  const title = `${p.display_name} · Tienda en Michimi`;
  const description = p.bio?.slice(0, 160) ?? `Productos de ${p.display_name}${p.city ? ` en ${p.city}` : ""}. Comprá con entrega protegida en Michimi.`;
  return { title, description, alternates: { canonical: `/tienda/${p.store_slug}` }, openGraph: { title, description, images: p.avatar_url ? [p.avatar_url] : undefined } };
}

export default async function Tienda({ params }: P) {
  const p = await load((await params).slug);
  if (!p) notFound();
  return <ProfileView p={p} />;
}
