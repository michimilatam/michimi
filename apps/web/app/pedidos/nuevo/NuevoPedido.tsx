"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, COUNTRIES, serviceRequestSchema, type CountryCode } from "@michimi/core";
import { supabaseBrowser } from "@/lib/supabase/client";

export function NuevoPedido({ country }: { country: CountryCode }) {
  const router = useRouter();
  const c = COUNTRIES[country];
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = serviceRequestSchema.safeParse({
      subcategory: String(f.get("subcategory") ?? ""),
      title: String(f.get("title") ?? ""),
      description: String(f.get("description") ?? ""),
      country, region: String(f.get("region") ?? ""), city: String(f.get("city") ?? ""),
      whenText: String(f.get("when") ?? "") || undefined,
    });
    if (!parsed.success) {
      const m: Record<string, string> = {};
      for (const i of parsed.error.issues) m[i.path.join(".")] ??= i.message;
      return setErrors(m);
    }
    setBusy(true);
    const d = parsed.data;
    const { data, error } = await supabaseBrowser().from("service_requests").insert({
      subcategory: d.subcategory, title: d.title, description: d.description, country: d.country, region: d.region, city: d.city, when_text: d.whenText ?? null, currency: c.local,
    }).select("id").single();
    if (error || !data) { setBusy(false); return setErrors({ form: error?.message ?? "No se pudo crear el pedido" }); }
    router.push(`/pedidos/${data.id}`);
  }
  const err = (k: string) => errors[k] && <p className="mt-1 text-sm text-bad">{errors[k]}</p>;

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4" noValidate>
      <header>
        <h1 className="text-3xl font-bold">Pedí presupuestos</h1>
        <p className="text-ink-soft">Los profesionales de tu zona te escriben con su precio. Vos elegís. Gratis.</p>
      </header>
      <div>
        <label className="label" htmlFor="subcategory">¿Qué servicio necesitás?</label>
        <select id="subcategory" name="subcategory" defaultValue="" className="field">
          <option value="" disabled>Elegí una opción</option>
          {CATEGORIES.servicios.subs.map((x) => <option key={x.slug} value={x.slug}>{x.label}</option>)}
        </select>{err("subcategory")}
      </div>
      <div>
        <label className="label" htmlFor="title">En una línea</label>
        <input id="title" name="title" className="field" placeholder="Ej.: Pintar 3 habitaciones y un pasillo" />{err("title")}
      </div>
      <div>
        <label className="label" htmlFor="description">Detalles <span className="font-normal">(opcional)</span></label>
        <textarea id="description" name="description" rows={4} className="field h-auto py-2" placeholder="Medidas, materiales, si ya tenés algo comprado…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="region">{c.regionLabel}</label>
          <select id="region" name="region" defaultValue={c.regions[0]} className="field">{c.regions.map((r) => <option key={r}>{r}</option>)}</select>{err("region")}
        </div>
        <div>
          <label className="label" htmlFor="city">Ciudad o barrio</label>
          <input id="city" name="city" className="field" />{err("city")}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="when">¿Para cuándo? <span className="font-normal">(opcional)</span></label>
        <input id="when" name="when" className="field" placeholder="Ej.: esta semana, antes del 15" />
      </div>
      <p className="text-xs text-ink-soft">Tu pedido es visible para profesionales. No pongas tu dirección exacta ni teléfono: coordiná por el chat.</p>
      {err("form")}
      <button disabled={busy} className="btn-primary w-full">{busy ? "Publicando…" : "Publicar pedido"}</button>
    </form>
  );
}
