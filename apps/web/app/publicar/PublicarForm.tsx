"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORIES, CONDITIONS, COUNTRIES, COUNTRY_CODES, CURRENCIES, currenciesFor, flag, listingDraftSchema, parseMoney,
  type CategorySlug, type CountryCode, type CurrencyCode,
} from "@michimi/core";
import { supabaseBrowser } from "@/lib/supabase/client";

const FIELD_LABEL: Record<string, string> = { marca: "Marca", modelo: "Modelo", bateria_pct: "Salud de batería (%)", medidas: "Medidas (alto × ancho × prof.)" };
const MAX_PHOTOS = 12;

export function PublicarForm({ initialCountry }: { initialCountry: CountryCode }) {
  const router = useRouter();
  const [country, setCountry] = useState<CountryCode>(initialCountry);
  const [region, setRegion] = useState<string>(COUNTRIES[initialCountry].regions[0]);
  const [category, setCategory] = useState<CategorySlug>("celulares");
  const [currency, setCurrency] = useState<CurrencyCode>(COUNTRIES[initialCountry].local);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function changeCountry(c: CountryCode) {
    setCountry(c);
    setRegion(COUNTRIES[c].regions[0]);
    setCurrency(COUNTRIES[c].local);
  }
  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list).filter((f) => f.type.startsWith("image/"))].slice(0, MAX_PHOTOS));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const attributes: Record<string, string> = {};
    for (const k of CATEGORIES[category].required) attributes[k] = String(f.get(`attr_${k}`) ?? "");
    const price = parseMoney(String(f.get("price") ?? ""), currency);
    const parsed = listingDraftSchema.safeParse({
      title: String(f.get("title") ?? ""),
      description: String(f.get("description") ?? ""),
      category,
      condition: String(f.get("condition")),
      priceAmount: price?.amount ?? 0,
      currency,
      country,
      region,
      city: String(f.get("city") ?? ""),
      defects: String(f.get("defects") ?? "") || undefined,
      accessories: String(f.get("accessories") ?? "") || undefined,
      attributes,
      photoCount: files.length,
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const i of parsed.error.issues) map[i.path.join(".")] ??= i.message;
      setErrors(map);
      document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
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
        price_amount: d.priceAmount, currency: d.currency, country: d.country, region: d.region, city: d.city,
        defects: d.defects, accessories: d.accessories, attributes: d.attributes,
      })
      .select("id")
      .single();
    if (error || !listing) { setBusy(false); return setErrors({ form: error?.message ?? "No se pudo publicar" }); }

    let failed = 0;
    for (const [i, file] of files.entries()) {
      setProgress(`Subiendo foto ${i + 1} de ${files.length}…`);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${u.user.id}/${listing.id}/${i}-${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("listing-photos").upload(path, file, { contentType: file.type });
      if (up.error) { failed++; continue; }
      const ins = await supabase.from("listing_photos").insert({ listing_id: listing.id, path, position: i });
      if (ins.error) failed++;
    }
    router.push(`/publicacion/${listing.id}${failed ? `?fotos_fallidas=${failed}` : ""}`);
  }

  const err = (k: string) => errors[k] && <p data-error className="mt-1 text-sm text-bad">{errors[k]}</p>;
  const c = COUNTRIES[country];

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6" noValidate>
      <header>
        <h1 className="text-3xl font-bold">Publicá gratis</h1>
        <p className="text-ink-soft">Las publicaciones con fotos y datos completos se venden más rápido.</p>
      </header>

      <section className="space-y-3">
        <p className="label">Fotos <span className="font-normal">(opcional, hasta {MAX_PHOTOS})</span></p>
        <label
          htmlFor="photos"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-ink/30 bg-card px-4 py-8 text-center transition-colors hover:border-ink hover:bg-lima/10"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lima text-2xl font-bold text-ink" aria-hidden="true">+</span>
          <span className="text-[15px] font-semibold">Agregar fotos</span>
          <span className="text-sm text-ink-soft">Tocá para elegir o arrastrá las imágenes acá. Mejor si son de distintos ángulos.</span>
        </label>
        <input id="photos" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        {files.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {previews.map((src, i) => (
              <div key={src} className="relative">
                <img src={src} alt={`Foto ${i + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-ink px-1.5 text-[11px] text-lima">Portada</span>}
                <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-sm text-white" aria-label={`Quitar foto ${i + 1}`}>×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">Título</label>
          <input id="title" name="title" className="field" placeholder="Ej.: iPhone 13 128 GB azul" />{err("title")}
        </div>
        <div>
          <label className="label" htmlFor="category">Categoría</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value as CategorySlug)} className="field">
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
          <label className="label" htmlFor="country">País</label>
          <select id="country" value={country} onChange={(e) => changeCountry(e.target.value as CountryCode)} className="field">
            {COUNTRY_CODES.map((k) => <option key={k} value={k}>{flag(k)} {COUNTRIES[k].name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="region">{c.regionLabel}</label>
          <select id="region" value={region} onChange={(e) => setRegion(e.target.value)} className="field">
            {c.regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {err("region")}
        </div>
        <div>
          <label className="label" htmlFor="city">Ciudad</label>
          <input id="city" name="city" className="field" placeholder={country === "PY" ? "Ej.: Fernando de la Mora" : "Ciudad"} />{err("city")}
        </div>
        <div>
          <label className="label" htmlFor="price">Precio</label>
          <div className="flex gap-2">
            <select aria-label="Moneda" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="field w-28">
              {currenciesFor(country).map((k) => <option key={k} value={k}>{CURRENCIES[k].symbol} {k}</option>)}
            </select>
            <input id="price" name="price" inputMode="decimal" className="field" placeholder={CURRENCIES[currency].decimals === 0 ? "1.500.000" : "350"} />
          </div>
          {err("priceAmount")}{err("currency")}
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Descripción</label>
          <textarea id="description" name="description" rows={5} className="field h-auto py-2" />{err("description")}
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="defects">Defectos visibles (ser honesto evita reclamos)</label>
          <input id="defects" name="defects" className="field" placeholder="Ej.: rayón leve en el borde" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="accessories">Accesorios incluidos</label>
          <input id="accessories" name="accessories" className="field" placeholder="Ej.: caja, cargador original" />
        </div>
      </div>
      {err("form")}
      <button disabled={busy} className="btn-primary w-full">{busy ? progress ?? "Publicando…" : "Publicar"}</button>
    </form>
  );
}
