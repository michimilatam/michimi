import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { VerificationActions, ReportActions, ListingModeration } from "./Actions";

export const metadata: Metadata = { title: "Administración", robots: { index: false } };
const REASONS: Record<string, string> = { estafa: "Posible estafa", producto_falso: "Producto falso", precio_sospechoso: "Precio sospechoso", spam: "Spam", ofensivo: "Ofensivo", otro: "Otro" };
type SP = Promise<{ t?: string; q?: string }>;

export default async function Admin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const t = sp.t ?? "verificaciones";
  const supabase = await supabaseServer();
  const { data: ok } = await supabase.rpc("is_admin");
  if (!ok) notFound();

  const [{ count: vPend }, { count: rOpen }, { count: lAct }, { count: users }] = await Promise.all([
    supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
    supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["abierto", "revisando"]),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "activa"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  const tab = (k: string, label: string, n?: number | null) => (
    <Link href={`/admin?t=${k}`} aria-current={t === k ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${t === k ? "bg-ink text-lima" : "border border-line bg-card hover:border-ink"}`}>
      {label}{n ? ` (${n})` : ""}
    </Link>
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold">Administración</h1>
        <p className="text-sm text-ink-soft">{users ?? 0} usuarios · {lAct ?? 0} publicaciones activas</p>
      </header>
      <nav className="flex flex-wrap gap-2">
        {tab("verificaciones", "Verificaciones", vPend)}
        {tab("denuncias", "Denuncias", rOpen)}
        {tab("publicaciones", "Publicaciones")}
      </nav>
      {t === "verificaciones" && <Verificaciones />}
      {t === "denuncias" && <Denuncias />}
      {t === "publicaciones" && <Publicaciones q={sp.q} />}
    </div>
  );
}

async function Verificaciones() {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("verification_requests")
    .select("*, user:profiles!verification_requests_user_id_fkey(id,display_name,avatar_url)")
    .order("created_at", { ascending: false }).limit(50);
  const paths = (data ?? []).flatMap((v) => [v.document_path, v.credential_path].filter(Boolean) as string[]);
  const { data: signed } = paths.length ? await supabase.storage.from("verificaciones").createSignedUrls(paths, 3600) : { data: [] };
  const url = new Map<string, string>((signed ?? []).filter((s) => s.path && s.signedUrl).map((s) => [s.path as string, s.signedUrl as string]));
  if (!data?.length) return <p className="rounded-card border border-dashed border-line p-8 text-center text-ink-soft">No hay solicitudes.</p>;
  return (
    <ul className="space-y-3">
      {data.map((v) => {
        const u = v.user as { id: string; display_name: string } | null;
        return (
          <li key={v.id} className="rounded-card border border-line bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={`/perfil/${u?.id}`} className="font-semibold hover:underline">{u?.display_name}</Link>
                <p className="text-sm">{v.profession}</p>
                {v.note && <p className="text-sm text-ink-soft">“{v.note}”</p>}
                <p className="text-xs text-ink-soft">{new Date(v.created_at).toLocaleString("es-PY")}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.status === "pendiente" ? "bg-warn/15 text-warn" : v.status === "aprobada" ? "bg-lima text-ink" : "bg-bad/10 text-bad"}`}>{v.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {url.get(v.document_path) && <a href={url.get(v.document_path)} target="_blank" rel="noopener noreferrer" className="underline">Ver documento</a>}
              {v.credential_path && url.get(v.credential_path) && <a href={url.get(v.credential_path)} target="_blank" rel="noopener noreferrer" className="underline">Ver título / matrícula</a>}
            </div>
            {v.status === "pendiente" && <VerificationActions id={v.id} />}
          </li>
        );
      })}
    </ul>
  );
}

async function Denuncias() {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("reports")
    .select("*, listing:listings(id,title,status), reporter:profiles!reports_reporter_id_fkey(display_name), reported:profiles!reports_reported_user_id_fkey(id,display_name)")
    .order("created_at", { ascending: false }).limit(100);
  if (!data?.length) return <p className="rounded-card border border-dashed border-line p-8 text-center text-ink-soft">No hay denuncias.</p>;
  const convIds = [...new Set(data.map((r) => r.conversation_id).filter(Boolean))] as string[];
  const { data: msgs } = convIds.length ? await supabase.from("messages").select("conversation_id,sender_id,body,kind,created_at").in("conversation_id", convIds).order("created_at", { ascending: false }).limit(300) : { data: [] };
  return (
    <ul className="space-y-3">
      {data.map((r) => (
        <li key={r.id} className="rounded-card border border-line bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{REASONS[r.reason] ?? r.reason}</p>
              {r.listing && <Link href={`/publicacion/${r.listing.id}`} className="block truncate text-sm underline">{r.listing.title} ({r.listing.status})</Link>}
              {r.reported && <Link href={`/perfil/${r.reported.id}`} className="text-sm text-ink-soft hover:underline">Denunciado: {r.reported.display_name}</Link>}
              {r.details && <p className="mt-1 text-sm">“{r.details}”</p>}
              {r.conversation_id && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer underline">Ver conversación denunciada</summary>
                  <ol className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg bg-paper p-2">
                    {(msgs ?? []).filter((m) => m.conversation_id === r.conversation_id).reverse().map((m, i) => (
                      <li key={i} className={m.sender_id === r.reported_user_id ? "font-semibold" : "text-ink-soft"}>
                        <span className="text-xs">{new Date(m.created_at).toLocaleString("es-PY")} · {m.sender_id === r.reported_user_id ? "Denunciado" : m.sender_id ? "Denunciante" : "Sistema"}:</span> {m.body}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              <p className="text-xs text-ink-soft">Por {r.reporter?.display_name} · {new Date(r.created_at).toLocaleString("es-PY")}</p>
            </div>
            <span className="rounded-full border border-line px-2 py-0.5 text-xs">{r.status}</span>
          </div>
          {["abierto", "revisando"].includes(r.status) && <ReportActions id={r.id} listingId={r.listing?.id ?? null} listingStatus={r.listing?.status ?? null} />}
        </li>
      ))}
    </ul>
  );
}

async function Publicaciones({ q }: { q?: string }) {
  const supabase = await supabaseServer();
  let query = supabase.from("listings").select("id,title,kind,status,created_at,seller:profiles!listings_seller_id_fkey(display_name)").order("created_at", { ascending: false }).limit(50);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data } = await query;
  return (
    <div className="space-y-3">
      <form className="flex gap-2"><input type="hidden" name="t" value="publicaciones" /><input name="q" defaultValue={q} className="field" placeholder="Buscar por título" /><button className="btn-ghost">Buscar</button></form>
      <ul className="divide-y divide-line rounded-card border border-line bg-card">
        {data?.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-3 p-3">
            <Link href={`/publicacion/${l.id}`} className="min-w-0 flex-1">
              <span className="block truncate font-semibold hover:underline">{l.title}</span>
              <span className="text-xs text-ink-soft">{l.kind} · {l.status} · {(l.seller as unknown as { display_name: string } | null)?.display_name} · {new Date(l.created_at).toLocaleDateString("es-PY")}</span>
            </Link>
            <ListingModeration id={l.id} status={l.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
