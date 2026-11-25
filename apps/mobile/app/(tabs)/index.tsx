import { useCallback, useEffect, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { CONDITIONS, COUNTRIES, COUNTRY_CODES, flag, formatMoney, type CountryCode, type Condition, type CurrencyCode } from "@michimi/core";
import { photoUrl, supabase } from "@/lib/supabase";
import { c, s } from "@/lib/theme";

type Row = { id: string; title: string; price_amount: number; currency: CurrencyCode; condition: Condition; city: string; status: string; listing_photos: { path: string; position: number }[] };

export default function Explorar() {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState<CountryCode>("PY");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("listings")
      .select("id,title,price_amount,currency,condition,city,status,listing_photos(path,position)")
      .eq("country", country).in("status", ["activa", "reservada"]).order("created_at", { ascending: false }).limit(40);
    if (q.trim()) query = query.textSearch("search", q.trim(), { type: "websearch", config: "spanish" });
    const { data } = await query;
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [q, country]);
  useEffect(() => { load(); }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={s.screen}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingTop: 10 }} style={{ flexGrow: 0 }}>
        {COUNTRY_CODES.map((k) => (
          <Pressable key={k} onPress={() => setCountry(k)} accessibilityRole="radio" accessibilityState={{ selected: country === k }}
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: country === k ? c.ink : c.card, borderWidth: 1, borderColor: country === k ? c.ink : c.line }}>
            <Text style={{ color: country === k ? c.lima : c.ink, fontWeight: "600" }}>{flag(k)} {COUNTRIES[k].name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ padding: 12 }}>
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={load} returnKeyType="search"
          placeholder="Buscá celulares, muebles, herramientas…" style={s.field} accessibilityLabel="Buscar" />
      </View>
      <FlatList
        data={rows}
        numColumns={2}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading ? <Text style={[s.soft, { textAlign: "center", marginTop: 40 }]}>No hay publicaciones con esa búsqueda.</Text> : undefined}
        renderItem={({ item }) => {
          const cover = [...item.listing_photos].sort((a, b) => a.position - b.position)[0];
          return (
            <Link href={`/publicacion/${item.id}`} asChild>
              <Pressable style={{ flex: 1 / 2, padding: 4 }}>
                <View style={[s.card, { padding: 0, overflow: "hidden" }]}>
                  <View style={{ aspectRatio: 1, backgroundColor: c.line }}>
                    {cover && <Image source={{ uri: photoUrl(cover.path) }} style={{ width: "100%", height: "100%" }} />}
                  </View>
                  <View style={{ padding: 10 }}>
                    <Text style={[s.price, { fontSize: 17 }]}>{formatMoney({ amount: item.price_amount, currency: item.currency })}</Text>
                    <Text numberOfLines={2} style={s.body}>{item.title}</Text>
                    <Text style={s.soft}>{item.status === "reservada" ? "Reservado · " : ""}{CONDITIONS[item.condition]} · {item.city}</Text>
                  </View>
                </View>
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
  );
}
