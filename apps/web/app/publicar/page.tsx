"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, CONDITIONS, currenciesFor, CURRENCIES, listingDraftSchema, parseMoney, type CategorySlug, type CurrencyCode } from "@michimi/core";
import { supabaseBrowser } from "@/lib/supabase/client";

const FIELD_LABEL: Record<string, string> = { marca: "Marca", modelo: "Modelo", bateria_pct: "Salud de batería (%)", medidas: "Medidas (alto × ancho × prof.)" };

export default function Publicar() {
  const router = useRouter();
  const [category, setCategory] = useState<CategorySlug>("celulares");
  const [currency, setCurrency] = useState<CurrencyCode>("PYG");
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const attributes: Record<string, string> = {};
    for (const k of CATEGORIES[category].required) attributes[k] = String(f.get(`attr_${k}`) ?? "");
    const price = parseMoney(String(f.get("price") ?? ""), currency);
    const draft = {
      title: String(f.get("title") ?? ""),
      description: String(f.get("description") ?? ""),
      category,
      condition: String(f.get("condition")),
      priceAmount: price?.amount ?? 0,
      currency,
      country: "PY",
      city: String(f.get("city") ?? ""),
      defects: String(f.get("defects") ?? "") || undefined,
      accessories: String(f.get("accessories") ?? "") || undefined,
      attributes,
      photoCount: files.length,
    };
    const parsed = listingDraftSchema.safeParse(draft);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const i of parsed.error.issues) map[i.path.join(".")] ??= i.message;
      return setErrors(map);
    }
    setErrors({});
    setBusy(true);
    const supabase = supabaseBrowser();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.push("/ingresar?next=/publicar");
    const d = parsed.data;
    const { data: listing, error } = await supabase
      .from("listings")
      .insert({
        seller_id: u.user.id, title: d.title, description: d.description, category: d.category, condition: d.condition,
        price_amount: d.priceAmount, currency: d.currency, country: d.country, city: d.city,
        defects: d.defects, accessories: d.accessories, attributes: d.attributes,
      })
      .select("id")
      .single();
    if (error || !listing) { setBusy(false); return setErrors({ form: error?.message ?? "No se pudo publicar" }); }
    for (const [i, file] of files.entries()) {
      const path = `${u.user.id}/${listing.id}/${i}-${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;
      const up = await supabase.storage.from("listing-photos").upload(path, file, { contentType: file.type });
      if (!up.error) await supabase.from("listing_photos").insert({ listing_id: listing.id, path, position: i });
    }
    router.push(`/publicacion/${listing.id}`);
  }

  const err = (k: string) => errors[k] && <p className="mt-1 text-sm text-bad">{errors[k]}</p>;

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6" noValidate>
      <header>
        <h1 className="text-3xl font-bold">Publicá gratis</h1>
        <p className="text-ink-soft">Las publicaciones completas se venden más rápido. Te pedimos solo lo que un comprador pregunta igual.</p>
      </header>

      <section className="space-y-2">
        <label className="label" htmlFor="photos">Fotos (mínimo 3, distintos ángulos)</label>
        <input id="photos" type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 12))} />
        <div className="flex gap-2 overflow-x-auto">
          {files.map((f) => <img key={f.name + f.size} src={URL.createObjectURL(f)} alt="" className="h-20 w-20 rounded-lg object-cover" />)}
        </div>
        {err("photoCount")}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">Título</label>
          <input id="title" name="title" className="field" placeholder="Ej.: iPhone 13 128 GB azul" />{err("title")}
        </div>
        <div>
          <label className="label" htmlFor="category">Categoría</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value as CategorySlug)} className="field">
            {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="condition">Estado</label>
          <select id="condition" name="condition" className="field" defaultValue="muy_bueno">
            {Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {CATEGORIES[category].required.map((k) => (
          <div key={k}>
            <label className="label" htmlFor={`attr_${k}`}>{FIELD_LABEL[k] ?? k}</label>
            <input id={`attr_${k}`} name={`attr_${k}`} className="field" />{err(`attributes.${k}`)}
          </div>
        ))}
        <div>
          <label className="label" htmlFor="price">Precio</label>
          <div className="flex gap-2">
            <select aria-label="Moneda" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="field w-28">
              {currenciesFor("PY").map((c) => <option key={c} value={c}>{CURRENCIES[c].symbol} {c}</option>)}
            </select>
            <input id="price" name="price" inputMode="decimal" className="field" placeholder={currency === "PYG" ? "1.500.000" : "350"} />
          </div>
          {err("priceAmount")}{err("currency")}
        </div>
        <div>
          <label className="label" htmlFor="city">Ciudad</label>
          <input id="city" name="city" className="field" defaultValue="Asunción" />{err("city")}
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Descripción</label>
          <textarea id="description" name="description" rows={5} className="field h-auto py-2" />{err("description")}
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="defects">Defectos visibles (sé honesto: evita reclamos)</label>
          <input id="defects" name="defects" className="field" placeholder="Ej.: rayón leve en el borde" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="accessories">Accesorios incluidos</label>
          <input id="accessories" name="accessories" className="field" placeholder="Ej.: caja, cargador original" />
        </div>
      </div>
      {err("form")}
      <button disabled={busy} className="btn-primary w-full">{busy ? "Publicando…" : "Publicar"}</button>
    </form>
  );
}
