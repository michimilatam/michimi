import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { formatMoney, parseMoney, type CurrencyCode } from "@michimi/core";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { Button } from "@/components/ui";
import { c, s } from "@/lib/theme";

type Msg = { id: number; sender_id: string | null; kind: string; body: string; offer_id: string | null };
type Offer = { id: string; created_by: string; amount: number; currency: CurrencyCode; status: string; expires_at: string };
const RISKY = /(\+?595|09\d{2})[\s-]?\d{3}[\s-]?\d{3}|c[oó]digo (de )?(verificaci[oó]n|sms|whatsapp)/i;

export default function Conversacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>("PYG");
  const [text, setText] = useState("");
  const [counterFor, setCounterFor] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const list = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    supabase.from("conversations").select("listing:listings(currency)").eq("id", id).single()
      .then(({ data }) => data && setCurrency((data.listing as unknown as { currency: CurrencyCode }).currency));
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at").then(({ data }) => setMsgs((data as Msg[]) ?? []));
    supabase.from("offers").select("*").eq("conversation_id", id).then(({ data }) => setOffers((data as Offer[]) ?? []));
    const ch = supabase.channel(`conv:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (p) => setMsgs((m) => [...m, p.new as Msg]))
      .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `conversation_id=eq.${id}` },
        (p) => setOffers((o) => [...o.filter((x) => x.id !== (p.new as Offer).id), p.new as Offer]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  async function send() {
    if (!text.trim() || !user) return;
    if (counterFor) {
      const m = parseMoney(text, currency);
      if (!m) return setErr("Monto inválido");
      const { error } = await supabase.rpc("make_offer", { p_conversation: id, p_amount: m.amount, p_currency: currency, p_parent: counterFor });
      if (error) return setErr(error.message);
      setCounterFor(null);
    } else {
      const { error } = await supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, body: text });
      if (error) return setErr(error.message);
    }
    setText("");
  }
  async function accept(offerId: string) {
    const { data, error } = await supabase.rpc("accept_offer", { p_offer: offerId });
    if (error) return setErr(error.message);
    router.push(`/operacion/${data}`);
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={list}
        data={msgs}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        onContentSizeChange={() => list.current?.scrollToEnd()}
        renderItem={({ item: m }) => {
          const mine = m.sender_id === user?.id;
          if (m.kind === "sistema") return <Text style={[s.soft, { textAlign: "center" }]}>{m.body}</Text>;
          if (m.kind === "oferta") {
            const o = offers.find((x) => x.id === m.offer_id);
            if (!o) return null;
            const canAnswer = o.status === "pendiente" && o.created_by !== user?.id && new Date(o.expires_at) > new Date();
            return (
              <View style={[s.card, { borderColor: c.ink, borderWidth: 2, alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "85%", gap: 6 }]}>
                <Text style={s.soft}>{mine ? "Tu oferta" : "Oferta recibida"} · {o.status}</Text>
                <Text style={s.price}>{formatMoney({ amount: o.amount, currency: o.currency })}</Text>
                {canAnswer && (
                  <View style={{ gap: 6 }}>
                    <Button title="Aceptar y reservar" onPress={() => accept(o.id)} />
                    <Button title="Contraofertar" kind="ghost" onPress={() => { setCounterFor(o.id); setText(""); }} />
                  </View>
                )}
              </View>
            );
          }
          return (
            <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: mine ? c.ink : c.card, borderRadius: 16, padding: 10, borderWidth: mine ? 0 : 1, borderColor: c.line }}>
              <Text style={{ color: mine ? "#fff" : c.ink, fontSize: 15 }}>{m.body}</Text>
            </View>
          );
        }}
      />
      {RISKY.test(text) && <Text style={{ color: c.warn, paddingHorizontal: 12 }}>Ojo: no compartas teléfonos ni códigos fuera de Michimi.</Text>}
      {err && <Text style={[s.error, { paddingHorizontal: 12 }]}>{err}</Text>}
      <View style={{ flexDirection: "row", gap: 8, padding: 12 }}>
        <TextInput value={text} onChangeText={setText} style={[s.field, { flex: 1 }]} keyboardType={counterFor ? "decimal-pad" : "default"}
          placeholder={counterFor ? "Monto de tu contraoferta" : "Escribí un mensaje"} accessibilityLabel="Mensaje" />
        <Button title="Enviar" onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}
