"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "y").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export function NewStoreInvite() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", slug: "", contact: "", website: "", instagram: "", phone: "", city: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((o) => ({ ...o, [k]: e.target.value, ...(k === "name" && (!o.slug || o.slug === slugify(o.name)) ? { slug: slugify(e.target.value) } : {}) }));
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const row = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null]));
    const { error } = await supabaseBrowser().from("store_invites").insert(row);
    setBusy(false);
    if (error) { setErr(error.message.includes("duplicate") ? "Esa dirección de tienda ya existe" : error.message); return; }
    setF({ name: "", slug: "", contact: "", website: "", instagram: "", phone: "", city: "" });
    router.refresh();
  }
  return (
    <form onSubmit={create} className="grid gap-2 rounded-card border border-line bg-card p-4 sm:grid-cols-2">
      <p className="font-semibold sm:col-span-2">Nueva tienda para invitar</p>
      <input required value={f.name} onChange={set("name")} className="field" placeholder="Nombre del comercio" />
      <input required value={f.slug} onChange={set("slug")} pattern="[a-z0-9-]{3,40}" className="field" placeholder="direccion-de-la-tienda" />
      <input value={f.contact} onChange={set("contact")} className="field" placeholder="Contacto (persona o email)" />
      <input value={f.city} onChange={set("city")} className="field" placeholder="Ciudad" />
      <input value={f.website} onChange={set("website")} className="field" placeholder="Sitio web" />
      <input value={f.instagram} onChange={set("instagram")} className="field" placeholder="@instagram" />
      <input value={f.phone} onChange={set("phone")} className="field" placeholder="Teléfono" />
      <button disabled={busy} className="btn-primary">{busy ? "Creando…" : "Crear invitación"}</button>
      {err && <p className="text-sm text-bad sm:col-span-2">{err}</p>}
    </form>
  );
}

const LABEL: Record<string, string> = { creada: "Creada", enviada: "Enviada", reclamada: "Reclamada", descartada: "Descartada" };

export function InviteStatus({ code, status }: { code: string; status: string }) {
  const router = useRouter();
  if (status === "reclamada") return <span className="rounded-full bg-lima px-2 py-0.5 text-xs font-semibold text-ink">Reclamada</span>;
  return (
    <select value={status} className="field h-9 w-auto text-sm"
      onChange={async (e) => { await supabaseBrowser().from("store_invites").update({ status: e.target.value }).eq("code", code); router.refresh(); }}>
      {["creada", "enviada", "descartada"].map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
    </select>
  );
}

export function CopyLink({ path }: { path: string }) {
  const [ok, setOk] = useState(false);
  const url = `https://www.michimi.com${path}`;
  return (
    <button type="button" className="underline" onClick={async () => { await navigator.clipboard.writeText(url); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      {ok ? "¡Copiado!" : `Copiar link de reclamo`}
    </button>
  );
}
