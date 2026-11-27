import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { StoreAdmin } from "./StoreAdmin";

export const metadata: Metadata = { title: "Administrar comercio", robots: { index: false } };

export default async function Administrar({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/ingresar?next=/tienda/${slug}/administrar`);
  const { data: s } = await supabase.from("stores").select("*").eq("slug", slug).is("deleted_at", null).maybeSingle();
  if (!s) notFound();
  const { data: team } = await supabase.from("store_members").select("user_id,role,created_at,profile:profiles(display_name,avatar_url)").eq("store_id", s.id).order("created_at");
  const me = (team ?? []).find((m) => m.user_id === auth.user!.id);
  if (!me) notFound();
  const { data: pend } = await supabase.from("store_invites").select("code").eq("store_id", s.id);
  const codes = (pend ?? []).map((i) => i.code);
  const { count } = codes.length
    ? await supabase.from("store_products").select("id", { count: "exact", head: true }).in("invite_code", codes).eq("status", "pendiente")
    : { count: 0 };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <Link href={`/tienda/${s.slug}`} className="text-sm text-ink-soft underline">← Ver la tienda</Link>
        <h1 className="text-2xl font-bold">Administrar {s.name}</h1>
        <p className="text-sm text-ink-soft">Sos {me.role === "dueño" ? "el dueño" : "parte del equipo"}.</p>
      </header>
      {!!count && (
        <Link href="/tienda/mi-catalogo" className="block rounded-card bg-lima/40 p-4 font-semibold">Tenés {count} productos preparados para revisar y publicar →</Link>
      )}
      <StoreAdmin
        store={{ id: s.id, slug: s.slug, name: s.name, bio: s.bio ?? "", website: s.website ?? "", instagram: s.instagram ?? "", phone: s.phone ?? "", city: s.city ?? "" }}
        team={(team ?? []).map((m) => ({ id: m.user_id, role: m.role, name: (m.profile as unknown as { display_name: string } | null)?.display_name ?? "Usuario" }))}
        me={auth.user.id}
        isOwner={me.role === "dueño"}
      />
    </div>
  );
}
