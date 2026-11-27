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

export function PrepareCatalog({ code }: { code: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/catalogo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    const j = (await r.json().catch(() => ({}))) as { count?: number; error?: string };
    setBusy(false);
    setMsg(j.error ?? `${j.count} productos leídos`);
    router.refresh();
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={run} disabled={busy} className="underline">{busy ? "Leyendo la web…" : "Preparar catálogo desde su web"}</button>
      {msg && <span className="text-ink-soft">{msg}</span>}
    </span>
  );
}

const firstName = "Luis Fernando";

function template(name: string, products: number, code: string) {
  const reclamo = `https://www.michimi.com/reclamar/${code}`;
  const vista = `${reclamo}/vista`;
  if (products > 0) {
    return {
      subject: `${name}: les armamos una tienda en Michimi`,
      body: `Hola, equipo de ${name}:

Soy ${firstName}, de Michimi (michimi.com), un marketplace paraguayo para comprar y vender con la entrega protegida por un PIN.

Tomamos ${products} productos de su web y les armamos una tienda de prueba. Todavía no está publicada: solo la ven ustedes con este link:
${vista}

Si les sirve, la reclaman gratis acá, revisan precios y publican lo que quieran:
${reclamo}

Durante el piloto no cobramos comisión ni mensualidad, y les damos una mano con la carga.

¿Les interesa? Respondan este correo y lo vemos.

Saludos,
${firstName}
Michimi`,
    };
  }
  return {
    subject: `${name}, una tienda gratis en Michimi`,
    body: `Hola, equipo de ${name}:

Soy ${firstName}, de Michimi (michimi.com), un marketplace paraguayo para comprar y vender con la entrega protegida por un PIN.

Les reservamos una tienda con su nombre. Se activa gratis desde acá:
${reclamo}

Si nos mandan su lista de productos (Excel, catálogo o fotos), se la cargamos nosotros. Durante el piloto no cobramos comisión ni mensualidad.

¿Les interesa? Respondan este correo y lo vemos.

Saludos,
${firstName}
Michimi`,
  };
}

export function OutreachBox({ code, name, products, email, sent, lastSent, optOut }: {
  code: string; name: string; products: number; email: string | null; sent: number; lastSent: string | null; optOut: boolean;
}) {
  const router = useRouter();
  const t = template(name, products, code);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(email ?? "");
  const [subject, setSubject] = useState(t.subject);
  const [body, setBody] = useState(t.body);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sb = supabaseBrowser();

  async function send() {
    setBusy(true); setMsg(null);
    const { error } = await sb.rpc("send_store_email", { p_code: code, p_to: to.trim(), p_subject: subject, p_body: body });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg("Enviado desde comercios@michimi.com");
    setOpen(false);
    router.refresh();
  }
  async function toggleOptOut() {
    await sb.from("store_invites").update({ opt_out: !optOut }).eq("code", code);
    router.refresh();
  }

  if (optOut) return (
    <span className="inline-flex items-center gap-2 text-ink-soft">Pidió BAJA <button type="button" onClick={toggleOptOut} className="underline">deshacer</button></span>
  );
  return (
    <div className="w-full">
      <span className="inline-flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="font-semibold underline">{sent ? "Escribir de nuevo" : "Escribir por email"}</button>
        {sent > 0 && <span className="text-ink-soft">{sent} enviado{sent > 1 ? "s" : ""} · último {new Date(lastSent!).toLocaleDateString("es-PY")}</span>}
        <button type="button" onClick={toggleOptOut} className="text-ink-soft underline">Marcar BAJA</button>
        {msg && <span>{msg}</span>}
      </span>
      {open && (
        <div className="mt-2 space-y-2 rounded-card border border-line p-3">
          <p className="text-xs text-ink-soft">Sale de <b>Michimi Comercios &lt;comercios@michimi.com&gt;</b>. Las respuestas te llegan a la Gmail. Revisalo y personalizalo antes de mandar.</p>
          <input type="email" value={to} onChange={(e) => setTo(e.target.value)} className="field" placeholder="Email del comercio" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="field" maxLength={120} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="field font-mono text-sm" />
          <button type="button" disabled={busy || !to} onClick={send} className="btn-primary h-9 px-4 text-sm">{busy ? "Enviando…" : "Enviar"}</button>
        </div>
      )}
    </div>
  );
}
