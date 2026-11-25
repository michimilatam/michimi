"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isImageFile, prepareImage } from "@/lib/image";

async function toUpload(f: File): Promise<File> {
  return f.type === "application/pdf" ? f : isImageFile(f) ? prepareImage(f) : Promise.reject(new Error("Formato no admitido"));
}

export function VerificacionForm({ userId, profession, bio }: { userId: string; profession: string; bio: string }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const prof = String(f.get("profession") ?? "").trim();
    const doc = f.get("document") as File | null;
    const cred = f.get("credential") as File | null;
    if (!doc || !doc.size) return setErr("Subí una foto de tu documento de identidad");
    setBusy(true); setErr(null);
    const supabase = supabaseBrowser();
    try {
      const up = async (file: File, name: string) => {
        const ready = await toUpload(file);
        const path = `${userId}/${Date.now()}-${name}.${ready.type === "application/pdf" ? "pdf" : "jpg"}`;
        const r = await supabase.storage.from("verificaciones").upload(path, ready, { contentType: ready.type });
        if (r.error) throw r.error;
        return path;
      };
      const document_path = await up(doc, "documento");
      const credential_path = cred && cred.size ? await up(cred, "titulo") : null;
      await supabase.from("profiles").update({ bio: String(f.get("bio") ?? "").trim() || null }).eq("id", userId);
      const { error } = await supabase.from("verification_requests").insert({ user_id: userId, profession: prof || null, document_path, credential_path, note: String(f.get("note") ?? "").trim() || null });
      if (error) throw error;
      router.refresh();
    } catch (x) {
      setBusy(false);
      setErr(x instanceof Error ? x.message : "No se pudo enviar");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="profession">Profesión u oficio <span className="font-normal">(solo si ofrecés servicios)</span></label>
        <input id="profession" name="profession" defaultValue={profession} className="field" placeholder="Ej.: Electricista matriculado" />
      </div>
      <div>
        <label className="label" htmlFor="bio">Sobre vos <span className="font-normal">(opcional, se ve en tu perfil)</span></label>
        <textarea id="bio" name="bio" defaultValue={bio} rows={3} className="field h-auto py-2" placeholder="Años de experiencia, especialidades, garantía…" />
      </div>
      <div>
        <label className="label" htmlFor="document">Documento de identidad (foto del frente)</label>
        <input id="document" name="document" type="file" accept="image/*,.heic,.heif,application/pdf" className="field h-auto py-2" />
      </div>
      <div>
        <label className="label" htmlFor="credential">Título, matrícula o certificado <span className="font-normal">(opcional, si ofrecés servicios)</span></label>
        <input id="credential" name="credential" type="file" accept="image/*,.heic,.heif,application/pdf" className="field h-auto py-2" />
      </div>
      <div>
        <label className="label" htmlFor="note">Comentario para el revisor <span className="font-normal">(opcional)</span></label>
        <input id="note" name="note" className="field" />
      </div>
      <p className="text-xs text-ink-soft">Tus documentos se guardan en privado. Solo los ve el equipo de Michimi para verificarte y no se muestran en tu perfil.</p>
      {err && <p className="text-sm text-bad">{err}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? "Enviando…" : "Enviar para revisión"}</button>
    </form>
  );
}
