import { useEffect, useState } from "react";
import { Image, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CONDITIONS, formatMoney, parseMoney, type Condition, type CurrencyCode } from "@michimi/core";
import { photoUrl, supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { Button } from "@/components/ui";
import { c, s } from "@/lib/theme";

type L = {
  id: string; title: string; description: string; price_amount: number; currency: CurrencyCode; condition: Condition;
  city: string; status: string; seller_id: string; defects: string | null; attributes: Record<string, string>;
  listing_photos: { path: string; position: number }[]; seller: { id: string; display_name: string };
};

export default function Publicacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [l, setL] = useState<L | null>(null);
  const [offer, setOffer] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("listings").select("*, listing_photos(path,position), seller:profiles!listings_seller_id_fkey(id,display_name)")
      .eq("id", id).single().then(({ data }) => setL(data as L));
  }, [id]);
  if (!l) return null;
  const photos = [...l.listing_photos].sort((a, b) => a.position - b.position);

  async function contact(withOffer: boolean) {
    if (!user) return router.push("/ingresar");
    setErr(null);
    const { data: conv, error } = await supabase.rpc("start_conversation", { p_listing: l!.id });
    if (error) return setErr(error.message);
    if (withOffer) {
      const m = parseMoney(offer, l!.currency);
      if (!m) return setErr("Escribí un monto válido");
      const r = await supabase.rpc("make_offer", { p_conversation: conv, p_amount: m.amount, p_currency: l!.currency });
      if (r.error) return setErr(r.error.message);
    }
    router.push(`/mensajes/${conv}`);
  }

  return (
    <ScrollView style={s.screen}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {photos.map((p) => <Image key={p.path} source={{ uri: photoUrl(p.path) }} style={{ width: 390, height: 390, backgroundColor: c.line }} accessibilityLabel={l.title} />)}
      </ScrollView>
      <View style={s.pad}>
        <Text style={s.price}>{formatMoney({ amount: l.price_amount, currency: l.currency })}</Text>
        <Text style={s.h2}>{l.title}</Text>
        <Text style={s.soft}>{CONDITIONS[l.condition]} · {l.city}</Text>

        <View style={s.card}>
          {Object.entries(l.attributes ?? {}).map(([k, v]) => <Text key={k} style={s.body}><Text style={s.soft}>{k.replace("_", " ")}: </Text>{v}</Text>)}
          <Text style={s.body}><Text style={s.soft}>Defectos: </Text>{l.defects || "no declarados"}</Text>
          <Text style={{ color: c.warn, fontSize: 13, marginTop: 6 }}>Sin verificar por Michimi: revisalo antes de dar tu PIN.</Text>
        </View>

        {user?.id === l.seller_id ? (
          <Text style={s.soft}>Es tu publicación.</Text>
        ) : l.status !== "activa" ? (
          <Text style={s.soft}>Reservado por otro comprador.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            <TextInput value={offer} onChangeText={setOffer} keyboardType="decimal-pad" style={s.field}
              placeholder={`Tu oferta (${formatMoney({ amount: l.price_amount, currency: l.currency })})`} accessibilityLabel="Tu oferta" />
            <Button title="Hacer una oferta" onPress={() => contact(true)} />
            <Button title="Preguntar al vendedor" kind="ghost" onPress={() => contact(false)} />
            {err && <Text style={s.error}>{err}</Text>}
          </View>
        )}

        <Button title={`Vendedor: ${l.seller.display_name}`} kind="ghost" onPress={() => router.push(`/perfil/${l.seller.id}`)} />
        <Text style={s.body}>{l.description}</Text>
      </View>
    </ScrollView>
  );
}
