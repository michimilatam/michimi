"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORIES, CONDITIONS, FIELD_LABEL, PRICE_TYPES, type PriceType, type ListingKind, COUNTRIES, COUNTRY_CODES, CURRENCIES, currenciesFor, flag, listingDraftSchema, parseMoney,
  type CategorySlug, type CountryCode, type CurrencyCode,
} from "@michimi/core";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isImageFile, prepareImage } from "@/lib/image";

const MAX_PHOTOS = 12;

export function PublicarForm({ initialCountry, initialKind = "producto" }: { initialCountry: CountryCode; initialKind?: ListingKind }) {
  const router = useRouter();
  const [kind, setKindState] = useState<ListingKind>(initialKind);
  const [priceType, setPriceType] = useState<PriceType>("fijo");
  const [coverage, setCoverage] = useState<string[]>([]);
  const [country, setCountry] = useState<CountryCode>(initialCountry);
  const [region, setRegion] = useState<string>(COUNTRIES[initialCountry].regions[0]);
  const [category, setCategory] = useState<CategorySlug | "">(initialKind === "servicio" ? "servicios" : "");
  const [subcategory, setSubcategory] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>(COUNTRIES[initialCountry].local);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [processing, setProcessing] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function setKind(k: ListingKind) {
    setKindState(k);
    setSubcategory("");
    setCategory(k === "servicio" ? "servicios" : "");
    if (k === "producto") setPriceType("fijo");
  }
  function changeCountry(c: CountryCode) {
    setCoverage([]);
    setCountry(c);
    setRegion(COUNTRIES[c].regions[0]);
    setCurrency(COUNTRIES[c].local);
  }
  async function addFiles(list: FileList | null) {
    if (!list) return;
    setPhotoError(null);
    const picked = Array.from(list);
    const images = picked.filter(isImageFile).slice(0, MAX_PHOTOS - files.length);
    if (images.length < picked.length) setPhotoError("Algunos archivos no son imágenes o superan el máximo de fotos.");
    setProcessing((n) => n + images.length);
    for (const f of images) {
      try {
        const jpg = await prepareImage(f);
        setFiles((prev) => (prev.length < MAX_PHOTOS ? [...prev, jpg] : prev));
      } catch {
        setPhotoError(`No pudimos leer "${f.name}". Probá con otra foto.`);
      } finally {
        setProcessing((n) => n - 1);
      }
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const attributes: Record<string, string> = {};
    for (const k of category ? CATEGORIES[category].fields : []) {
      const v = String(f.get(`attr_${k}`) ?? "").trim();
      if (v) attributes[k] = v;
    }
    const price = parseMoney(String(f.get("price") ?? ""), currency);
    const parsed = listingDraftSchema.safeParse({
      title: String(f.get("title") ?? ""),
      description: String(f.get("description") ?? ""),
      category: category || undefined,
      subcategory,
      kind,
      condition: kind === "producto" ? String(f.get("condition")) : undefined,
      priceType,
      priceAmount: priceType === "presupuesto" ? undefined : price?.amount || undefined,
      coverageRegions: kind === "servicio" ? coverage : [],
      schedule: String(f.get("schedule") ?? "") || undefined,
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
        seller_id: u.user.id, title: d.title, description: d.description, category: d.category, subcategory: d.subcategory, condition: d.condition ?? null,
        kind: d.kind, price_type: d.priceType, coverage_regions: d.coverageRegions, schedule: d.schedule ?? null,
        price_amount: d.priceAmount ?? null, currency: d.currency, country: d.country, region: d.region, city: d.city,
        defects: d.defects, accessories: d.accessories, attributes: d.attributes,
      })
      .select("id")
      .single();
    if (error || !listing) { setBusy(false); return setErrors({ form: error?.message ?? "No se pudo publicar" }); }

    let failed = 0;
    for (const [i, file] of files.entries()) {
      setProgress(`Subiendo foto ${i + 1} de ${files.length}…`);
      const path = `${u.user.id}/${listing.id}/${i}-${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from("listing-photos").upload(path, file, { contentType: "image/jpeg" });
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
        <h1 className="text-3xl font-bold">{kind === "servicio" ? "Ofrecé tu servicio gratis" : "Publicá gratis"}</h1>
        <p className="text-ink-soft">{kind === "servicio" ? "Mostrá trabajos anteriores y dónde atendés: así te eligen." : "Las publicaciones con fotos y datos completos se venden más rápido."}</p>
      </header>
      <div className="flex max-w-sm gap-1 rounded-full border border-line bg-card p-1" role="radiogroup" aria-label="Qué publicás">
        {(["producto", "servicio"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            className={`flex-1 rounded-full px-4 py-2 text-[15px] font-semibold ${kind === k ? "bg-ink text-lima" : "text-ink-soft hover:text-ink"}`}>
            {k === "producto" ? "Un producto" : "Un servicio"}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <p className="label">{kind === "servicio" ? "Fotos de trabajos realizados" : "Fotos"} <span className="font-normal">(opcional, hasta {MAX_PHOTOS})</span></p>
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
        <input id="photos" type="file" accept="image/*,.heic,.heif" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        {processing > 0 && <p className="text-sm text-ink-soft">Preparando {processing} foto(s)…</p>}
        {photoError && <p className="text-sm text-bad">{photoError}</p>}
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
          <input id="title" name="title" className="field" placeholder={kind === "servicio" ? "Ej.: Electricista matriculado, instalaciones y reparaciones" : "Ej.: iPhone 13 128 GB azul"} />{err("title")}
        </div>
        {kind === "producto" && <div>
          <label className="label" htmlFor="category">Categoría</label>
          <select id="category" value={category} onChange={(e) => { setCategory(e.target.value as CategorySlug); setSubcategory(""); }} className={`field ${category ? "" : "text-ink-soft"}`}>
            <option value="" disabled>Elegí una categoría</option>
            {Object.entries(CATEGORIES).filter(([k]) => k !== "servicios").map(([k, v]) => <option key={k} value={k} className="text-ink">{v.label}</option>)}
          </select>
          {err("category")}
        </div>}
        <div>
          <label className="label" htmlFor="subcategory">{kind === "servicio" ? "Tipo de servicio" : "Subcategoría"}</label>
          <select id="subcategory" value={subcategory} disabled={!category} onChange={(e) => setSubcategory(e.target.value)}
            className={`field disabled:opacity-50 ${subcategory ? "" : "text-ink-soft"}`}>
            <option value="" disabled>{category ? "Elegí una subcategoría" : "Primero elegí la categoría"}</option>
            {category && CATEGORIES[category].subs.map((x) => <option key={x.slug} value={x.slug} className="text-ink">{x.label}</option>)}
          </select>
          {err("subcategory")}
        </div>
        {kind === "producto" ? (
          <div>
            <label className="label" htmlFor="condition">Estado</label>
            <select id="condition" name="condition" className="field" defaultValue="muy_bueno">
              {Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="schedule">Horario de atención <span className="font-normal">(opcional)</span></label>
            <input id="schedule" name="schedule" className="field" placeholder="Ej.: Lun a sáb, 7 a 18 h" />
          </div>
        )}
        {kind === "producto" && category && CATEGORIES[category].fields.map((k) => (
          <div key={k}>
            <label className="label" htmlFor={`attr_${k}`}>{FIELD_LABEL[k] ?? k} <span className="font-normal">(opcional)</span></label>
            <input id={`attr_${k}`} name={`attr_${k}`} className="field" />
          </div>
        ))}

        <div>
          <label className="label" htmlFor="country">País</label>
          <select id="country" value={country} onChange={(e) => changeCountry(e.target.value as CountryCode)} className="field">
            {COUNTRY_CODES.map((k) => <option key={k} value={k}>{flag(k)} {COUNTRIES[k].name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="region">{kind === "servicio" ? `Tu ${c.regionLabel.toLowerCase()}` : c.regionLabel}</label>
          <select id="region" value={region} onChange={(e) => setRegion(e.target.value)} className="field">
            {c.regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {err("region")}
        </div>
        <div>
          <label className="label" htmlFor="city">Ciudad</label>
          <input id="city" name="city" className="field" placeholder={country === "PY" ? "Ej.: Fernando de la Mora" : "Ciudad"} />{err("city")}
        </div>
        {kind === "servicio" && (
          <fieldset className="sm:col-span-2">
            <legend className="label">¿Dónde atendés? <span className="font-normal">(si no marcás, solo en tu {c.regionLabel.toLowerCase()})</span></legend>
            <div className="flex flex-wrap gap-2">
              {c.regions.map((r) => {
                const on = coverage.includes(r);
                return (
                  <button key={r} type="button" aria-pressed={on} onClick={() => setCoverage((p) => on ? p.filter((x) => x !== r) : [...p, r])}
                    className={`rounded-full border px-3 py-1 text-sm ${on ? "border-ink bg-ink text-lima" : "border-line bg-card hover:border-ink"}`}>{r}</button>
                );
              })}
            </div>
          </fieldset>
        )}
        {kind === "servicio" && (
          <div>
            <label className="label" htmlFor="priceType">Cómo cobrás</label>
            <select id="priceType" value={priceType} onChange={(e) => setPriceType(e.target.value as PriceType)} className="field">
              {Object.entries(PRICE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}
        {priceType !== "presupuesto" && <div>
          <label className="label" htmlFor="price">{priceType === "hora" ? "Precio por hora" : priceType === "desde" ? "Precio desde" : "Precio"}</label>
          <div className="flex gap-2">
            <select aria-label="Moneda" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="field w-28">
              {currenciesFor(country).map((k) => <option key={k} value={k}>{CURRENCIES[k].symbol} {k}</option>)}
            </select>
            <input id="price" name="price" inputMode="decimal" className="field" placeholder={CURRENCIES[currency].decimals === 0 ? "1.500.000" : "350"} />
          </div>
          {err("priceAmount")}{err("currency")}
        </div>}

        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Descripción <span className="font-normal">(opcional)</span></label>
          <textarea id="description" name="description" rows={5} className="field h-auto py-2" />{err("description")}
        </div>
        {kind === "producto" && <>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="defects">Defectos visibles (ser honesto evita reclamos)</label>
          <input id="defects" name="defects" className="field" placeholder="Ej.: rayón leve en el borde" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="accessories">Accesorios incluidos</label>
          <input id="accessories" name="accessories" className="field" placeholder="Ej.: caja, cargador original" />
        </div>
        </>}
      </div>
      {err("form")}
      <button disabled={busy || processing > 0} className="btn-primary w-full">{busy ? progress ?? "Publicando…" : kind === "servicio" ? "Publicar servicio" : "Publicar"}</button>
    </form>
  );
}
