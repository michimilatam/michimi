import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { CATEGORIES, CONDITIONS, FIELD_LABEL, COUNTRIES, CURRENCIES, currenciesFor, listingDraftSchema, parseMoney, type CategorySlug, type Condition, type CurrencyCode } from "@michimi/core";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { Button } from "@/components/ui";
import { c, s } from "@/lib/theme";


function Chips<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {options.map(([k, label]) => (
        <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="radio" accessibilityState={{ selected: value === k }}
          style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: value === k ? c.ink : c.line, backgroundColor: value === k ? c.ink : c.card }}>
          <Text style={{ color: value === k ? c.lima : c.ink, fontWeight: "600" }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function Publicar() {
  const { user } = useSession();
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [category, setCategory] = useState<CategorySlug | "">("");
  const [subcategory, setSubcategory] = useState("");
  const [condition, setCondition] = useState<Condition>("muy_bueno");
  const [currency, setCurrency] = useState<CurrencyCode>("PYG");
  const [region, setRegion] = useState<string>(COUNTRIES.PY.regions[0]);
  const [f, setF] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  if (!user) {
    return <View style={[s.screen, s.pad]}><Text style={s.h1}>Publicá gratis</Text><Button title="Ingresar para publicar" onPress={() => router.push("/ingresar")} /></View>;
  }

  async function pick() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 12, quality: 0.7 });
    if (!r.canceled) setPhotos(r.assets.slice(0, 12));
  }

  async function submit() {
    const attributes: Record<string, string> = {};
    for (const k of category ? CATEGORIES[category].fields : []) {
      const v = (f[`attr_${k}`] ?? "").trim();
      if (v) attributes[k] = v;
    }
    const parsed = listingDraftSchema.safeParse({
      title: f.title ?? "", description: f.description ?? "", category: category || undefined, subcategory, condition,
      priceAmount: parseMoney(f.price ?? "", currency)?.amount ?? 0, currency, country: "PY",
      region, city: f.city ?? "", defects: f.defects || undefined, accessories: f.accessories || undefined, attributes, photoCount: photos.length,
    });
    if (!parsed.success) {
      const m: Record<string, string> = {};
      for (const i of parsed.error.issues) m[i.path.join(".")] ??= i.message;
      return setErrors(m);
    }
    setErrors({}); setBusy(true);
    const d = parsed.data;
    const { data: listing, error } = await supabase.from("listings").insert({
      seller_id: user!.id, title: d.title, description: d.description, category: d.category, subcategory: d.subcategory, condition: d.condition,
      price_amount: d.priceAmount, currency: d.currency, country: d.country, region: d.region, city: d.city, defects: d.defects, accessories: d.accessories, attributes: d.attributes,
    }).select("id").single();
    if (error || !listing) { setBusy(false); return setErrors({ form: error?.message ?? "No se pudo publicar" }); }
    for (const [i, p] of photos.entries()) {
      const body = await (await fetch(p.uri)).arrayBuffer();
      const path = `${user!.id}/${listing.id}/${i}-${Date.now()}.jpg`;
      const up = await supabase.storage.from("listing-photos").upload(path, body, { contentType: p.mimeType ?? "image/jpeg" });
      if (!up.error) await supabase.from("listing_photos").insert({ listing_id: listing.id, path, position: i });
    }
    setBusy(false);
    router.push(`/publicacion/${listing.id}`);
  }

  const E = ({ k }: { k: string }) => (errors[k] ? <Text style={s.error}>{errors[k]}</Text> : null);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Publicá gratis</Text>
      <Button title={photos.length ? `${photos.length} fotos · cambiar` : "＋ Agregar fotos (opcional)"} kind="ghost" onPress={pick} />
      <ScrollView horizontal>{photos.map((p) => <Image key={p.uri} source={{ uri: p.uri }} style={{ width: 72, height: 72, borderRadius: 8, marginRight: 6 }} />)}</ScrollView>
      <E k="photoCount" />
      <TextInput placeholder="Título (ej.: iPhone 13 128 GB)" style={s.field} onChangeText={set("title")} /><E k="title" />
      <Text style={s.soft}>Categoría</Text>
      <Chips<CategorySlug | ""> options={Object.entries(CATEGORIES).map(([k, v]) => [k as CategorySlug, v.label])} value={category} onChange={(v) => { setCategory(v); setSubcategory(""); }} />
      <E k="category" />
      {category !== "" && (
        <>
          <Text style={s.soft}>Subcategoría</Text>
          <Chips options={CATEGORIES[category].subs.map((x) => [x.slug, x.label] as [string, string])} value={subcategory} onChange={setSubcategory} />
          <E k="subcategory" />
        </>
      )}
      {category !== "" && CATEGORIES[category].fields.map((k) => (
        <TextInput key={k} placeholder={`${FIELD_LABEL[k] ?? k} (opcional)`} style={s.field} onChangeText={set(`attr_${k}`)} />
      ))}
      <Text style={s.soft}>Estado</Text>
      <Chips options={Object.entries(CONDITIONS) as [Condition, string][]} value={condition} onChange={setCondition} />
      <Text style={s.soft}>Moneda</Text>
      <Chips options={currenciesFor("PY").map((k) => [k, `${CURRENCIES[k].symbol} ${k}`])} value={currency} onChange={setCurrency} />
      <TextInput placeholder={currency === "PYG" ? "Precio (1.500.000)" : "Precio (350)"} keyboardType="decimal-pad" style={s.field} onChangeText={set("price")} /><E k="priceAmount" />
      <Text style={s.soft}>{COUNTRIES.PY.regionLabel}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chips options={COUNTRIES.PY.regions.map((r) => [r, r] as [string, string])} value={region} onChange={setRegion} />
      </ScrollView>
      <TextInput placeholder="Ciudad" style={s.field} onChangeText={set("city")} /><E k="city" />
      <TextInput placeholder="Descripción (opcional)" multiline style={[s.field, { height: 110, paddingTop: 10 }]} onChangeText={set("description")} /><E k="description" />
      <TextInput placeholder="Defectos visibles" style={s.field} onChangeText={set("defects")} />
      <TextInput placeholder="Accesorios incluidos" style={s.field} onChangeText={set("accessories")} />
      <E k="form" />
      <Button title={busy ? "Publicando…" : "Publicar"} disabled={busy} onPress={submit} />
    </ScrollView>
  );
}
