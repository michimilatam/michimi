import type { Metadata } from "next";
import { currentCountry } from "@/lib/country";
import { supabaseServer } from "@/lib/supabase/server";
import { PublicarForm } from "./PublicarForm";

export const metadata: Metadata = { title: "Publicar" };

export default async function Publicar({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data: p } = u.user ? await supabase.from("profiles").select("city").eq("id", u.user.id).maybeSingle() : { data: null };
  return <PublicarForm initialCountry={await currentCountry()} initialKind={sp.tipo === "servicio" ? "servicio" : "producto"} defaultCity={p?.city ?? undefined} />;
}
