"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isImageFile, prepareImage } from "@/lib/image";
import { photoUrl } from "@/lib/photo";
import { COUNTRIES, COUNTRY_COOKIE, flag, type CountryCode } from "@michimi/core";

type P = { display_name: string; avatar_url: string | null; city: string | null; bio: string | null; profession: string | null; professional_status: string; country: string };

export function EditarPerfil({ userId, initial }: { userId: string; initial: P }) {
  const router = useRouter();
  const [avatar, setAvatar] = useState(initial.avatar_url);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verified = initial.professional_status === "verificado";

  async function pick(f: File | undefined) {
    if (!f || !isImageFile(f)) return;
    try {
      const jpg = await prepareImage(f);
      setFile(jpg);
      setAvatar(URL.createObjectURL(jpg));
    } catch { setErr("No pudimos leer esa foto. Probá con otra."); }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    if (name.length < 2) return setErr("Escribí tu nombre");
    setBusy(true); setErr(null);
    const supabase = supabaseBrowser();
    let avatar_url = initial.avatar_url;
    if (file) {
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const up = await supabase.storage.from("listing-photos").upload(path, file, { contentType: "image/jpeg" });
      if (up.error) { setBusy(false); return setErr(up.error.message); }
      avatar_url = photoUrl(path);
    }
    const { error } = await supabase.from("profiles").update({
      display_name: name, avatar_url,
      city: String(f.get("city") ?? "").trim() || null,
      bio: String(f.get("bio") ?? "").trim() || null,
      profession: String(f.get("profession") ?? "").trim() || null,
      country: String(f.get("country") ?? "PY"),
    }).eq("id", userId);
    document.cookie = `${COUNTRY_COOKIE}=${String(f.get("country") ?? "PY")}; path=/; max-age=31536000; samesite=lax`;
    if (error) { setBusy(false); return setErr(error.message); }
    router.push(`/perfil/${userId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4" noValidate>
      <h1 className="text-3xl font-bold">Editar perfil</h1>
      <div className="flex items-center gap-4">
        {avatar ? <img src={avatar} alt="" className="h-20 w-20 rounded-full object-cover" referrerPolicy="no-referrer" /> : <span className="h-20 w-20 rounded-full bg-line" />}
        <label className="btn-ghost cursor-pointer">
          Cambiar foto
          <input type="file" accept="image/*,.heic,.heif" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      </div>
      <div>
        <label className="label" htmlFor="name">Nombre que ven los demás</label>
        <input id="name" name="name" defaultValue={initial.display_name} className="field" />
        {verified && <p className="mt-1 text-xs text-ink-soft">Tu cuenta está verificada: usá tu nombre real para que coincida con tu documento.</p>}
      </div>
      <div>
        <label className="label" htmlFor="country">País</label>
        <select id="country" name="country" defaultValue={initial.country} className="field">
          {(Object.keys(COUNTRIES) as CountryCode[]).map((k) => <option key={k} value={k}>{flag(k)} {COUNTRIES[k].name}</option>)}
        </select>
        <p className="mt-1 text-xs text-ink-soft">Es el país que vas a ver al entrar a Michimi. Siempre podés cambiarlo desde el pie de página.</p>
      </div>
      <div>
        <label className="label" htmlFor="city">Ciudad <span className="font-normal">(opcional)</span></label>
        <input id="city" name="city" defaultValue={initial.city ?? ""} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="profession">Profesión u oficio <span className="font-normal">(opcional, si ofrecés servicios)</span></label>
        <input id="profession" name="profession" defaultValue={initial.profession ?? ""} className="field" placeholder="Ej.: Electricista matriculado" />
      </div>
      <div>
        <label className="label" htmlFor="bio">Sobre vos <span className="font-normal">(opcional)</span></label>
        <textarea id="bio" name="bio" rows={4} defaultValue={initial.bio ?? ""} className="field h-auto py-2" />
      </div>
      {err && <p className="text-sm text-bad">{err}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? "Guardando…" : "Guardar cambios"}</button>
    </form>
  );
}
