import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { StoreView, type Store } from "@/components/StoreView";

type P = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("stores").select("*").eq("slug", slug).is("deleted_at", null).maybeSingle();
  return data as Store | null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = await load((await params).slug);
  if (!s) return {};
  const title = `${s.name} · Tienda en Michimi`;
  const description = s.bio?.slice(0, 160) ?? `Productos de ${s.name}${s.city ? ` en ${s.city}` : ""}. Comprá con entrega protegida en Michimi.`;
  return { title, description, alternates: { canonical: `/tienda/${s.slug}` }, openGraph: { title, description, images: s.avatar_url ? [s.avatar_url] : undefined } };
}

export default async function Tienda({ params }: P) {
  const s = await load((await params).slug);
  if (!s) notFound();
  return <StoreView s={s} />;
}
