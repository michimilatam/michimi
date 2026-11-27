"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type S = { id: string; slug: string; name: string; bio: string; website: string; instagram: string; phone: string; city: string };
type M = { id: string; role: string; name: string };

export function StoreAdmin({ store, team, me, isOwner }: { store: S; team: M[]; me: string; isOwner: boolean }) {
  const router = useRouter();
  const [f, setF] = useState(store);
  const [msg, setMsg] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [teamMsg, setTeamMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [delErr, setDelErr] = useState<string | null>(null);
  const sb = supabaseBrowser();
  const set = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((o) => ({ ...o, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb.from("stores").update({
      name: f.name.trim(), bio: f.bio.trim() || null, website: f.website.trim() || null,
      instagram: f.instagram.trim().replace(/^@/, "") || null, phone: f.phone.trim() || null, city: f.city.trim() || null,
    }).eq("id", store.id);
    setMsg(error ? error.message : "Guardado");
    router.refresh();
  }
  async function add(e: React.FormEvent) {
    e.preventDefault(); setTeamMsg(null);
    const { data, error } = await sb.rpc("add_store_member", { p_store: store.id, p_email: email });
    setTeamMsg(error ? error.message : `${data} ya es parte del equipo`);
    if (!error) { setEmail(""); router.refresh(); }
  }
  async function remove(id: string) {
    const { error } = await sb.rpc("remove_store_member", { p_store: store.id, p_user: id });
    if (error) return setTeamMsg(error.message);
    if (id === me) return router.push("/mis-publicaciones");
    router.refresh();
  }
  async function destroy() {
    setDelErr(null);
    const { error } = await sb.rpc("delete_store", { p_store: store.id });
    if (error) return setDelErr(error.message);
    router.push("/mis-publicaciones");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-3 rounded-card border border-line bg-card p-4">
        <h2 className="font-semibold">Datos del comercio</h2>
        <input required minLength={2} maxLength={80} value={f.name} onChange={set("name")} className="field" placeholder="Nombre" />
        <textarea value={f.bio} onChange={set("bio")} rows={3} maxLength={1000} className="field" placeholder="Qué vendés, horarios, zona de entrega…" />
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={f.website} onChange={set("website")} className="field" placeholder="Sitio web" />
          <input value={f.instagram} onChange={set("instagram")} className="field" placeholder="@instagram" />
          <input value={f.phone} onChange={set("phone")} className="field" placeholder="Teléfono" />
          <input value={f.city} onChange={set("city")} className="field" placeholder="Ciudad" />
        </div>
        <p className="text-xs text-ink-soft">Dirección: michimi.com/tienda/{store.slug}</p>
        <button className="btn-primary">Guardar</button>
        {msg && <span className="ml-3 text-sm">{msg}</span>}
      </form>

      <section className="space-y-3 rounded-card border border-line bg-card p-4">
        <h2 className="font-semibold">Equipo</h2>
        <p className="text-sm text-ink-soft">Todos pueden publicar, editar, responder mensajes, ofertar y confirmar entregas. Solo el dueño suma o saca personas y puede borrar el comercio.</p>
        <ul className="divide-y divide-line">
          {team.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 py-2">
              <span><b>{m.name}</b>{m.id === me && " (vos)"} <span className="text-sm text-ink-soft">· {m.role === "dueño" ? "Dueño" : "Equipo"}</span></span>
              {m.role !== "dueño" && (isOwner || m.id === me) && (
                <button type="button" onClick={() => remove(m.id)} className="text-sm text-bad underline">{m.id === me ? "Salir del equipo" : "Sacar"}</button>
              )}
            </li>
          ))}
        </ul>
        {isOwner && (
          <form onSubmit={add} className="flex flex-wrap gap-2">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field flex-1" placeholder="Email de su cuenta en Michimi" />
            <button className="btn-ghost">Sumar al equipo</button>
          </form>
        )}
        {teamMsg && <p className="text-sm">{teamMsg}</p>}
      </section>

      {isOwner && (
        <section className="space-y-3 rounded-card border border-bad/40 p-4">
          <h2 className="font-semibold text-bad">Borrar comercio</h2>
          <p className="text-sm">Se borran la tienda y todas sus publicaciones, y el equipo pierde el acceso. Las operaciones terminadas y las calificaciones quedan en el historial. No se puede deshacer.</p>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field" placeholder={`Escribí ${store.name} para confirmar`} />
          <button type="button" disabled={confirm.trim() !== store.name} onClick={destroy} className="rounded-full bg-bad px-4 py-2 font-semibold text-white disabled:opacity-40">Borrar comercio</button>
          {delErr && <p className="text-sm text-bad">{delErr}</p>}
        </section>
      )}
    </div>
  );
}
