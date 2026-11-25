import { useCallback, useEffect, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { CONDITIONS, formatMoney, type Condition, type CurrencyCode } from "@michimi/core";
import { photoUrl, supabase } from "@/lib/supabase";
import { c, s } from "@/lib/theme";

type Row = { id: string; title: string; price_amount: number; currency: CurrencyCode; condition: Condition; city: string; status: string; listing_photos: { path: string; position: number }[] };

export default function Explorar() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("listings")
      .select("id,title,price_amount,currency,condition,city,status,listing_photos(path,position)")
      .eq("country", "PY").in("status", ["activa", "reservada"]).order("created_at", { ascending: false }).limit(40);
    if (q.trim()) query = query.textSearch("search", q.trim(), { type: "websearch", config: "spanish" });
    const { data } = await query;
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [q]);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={s.screen}>
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
