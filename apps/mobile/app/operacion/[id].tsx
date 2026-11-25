import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { formatMoney, OPERATION_LABEL, RATING_CRITERIA, type CurrencyCode, type OperationStatus } from "@michimi/core";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { Button } from "@/components/ui";
import { c, s } from "@/lib/theme";

type Op = { id: string; buyer_id: string; seller_id: string; amount: number; currency: CurrencyCode; status: OperationStatus; listing: { title: string } | null };

export default function Operacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [op, setOp] = useState<Op | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [rated, setRated] = useState(false);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [criteria, setCriteria] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("operations").select("*, listing:listings(title)").eq("id", id).single();
    setOp(data as Op);
    const p = await supabase.from("operation_pins").select("pin").eq("operation_id", id).maybeSingle();
    setPin(p.data?.pin ?? null);
    const r = await supabase.from("ratings").select("id").eq("operation_id", id).eq("rater_id", user.id).maybeSingle();
    setRated(!!r.data);
  }, [id, user]);
  useEffect(() => { load(); }, [load]);
  if (!op || !user) return null;

  const role = op.buyer_id === user.id ? "buyer" : "seller";
  const ratedRole = role === "buyer" ? "seller" : "buyer";

  async function rpc(name: "complete_operation" | "cancel_operation") {
    setErr(null);
    const args = name === "complete_operation" ? { p_operation: id, p_pin: input.trim() } : { p_operation: id };
    const { error } = await supabase.rpc(name, args);
    if (error) setErr(error.message); else load();
  }
  async function rate() {
    if (!score) return setErr("Elegí de 1 a 5 estrellas");
    const { error } = await supabase.from("ratings").insert({
      operation_id: id, rater_id: user!.id, ratee_id: user!.id, role: ratedRole, score, criteria, comment: comment.trim() || null,
    });
    if (error) setErr(error.message); else load();
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Text style={s.soft}>{OPERATION_LABEL[op.status]}</Text>
      <Text style={s.h2}>{op.listing?.title}</Text>
      <Text style={s.price}>{formatMoney({ amount: op.amount, currency: op.currency })}</Text>

      {op.status === "reservada" && (
        <>
          <View style={s.card}>
            <Text style={s.h2}>Antes de encontrarse</Text>
            <Text style={s.body}>• Lugar público y con gente.{"\n"}• Revisá el producto antes de pagar y de dar el PIN.{"\n"}• Nunca compartas códigos de SMS o WhatsApp.</Text>
          </View>
          {role === "buyer" ? (
            <View style={{ backgroundColor: c.ink, borderRadius: 14, padding: 18 }}>
              <Text style={{ color: "#ffffffb0" }}>Tu PIN de entrega</Text>
              <Text style={{ color: c.lima, fontSize: 44, fontWeight: "700", letterSpacing: 10 }}>{pin}</Text>
              <Text style={{ color: "#ffffffd0" }}>Dáselo al vendedor solo con el producto en la mano.</Text>
            </View>
          ) : (
            <>
              <TextInput value={input} onChangeText={setInput} keyboardType="number-pad" maxLength={6} placeholder="PIN del comprador"
                style={[s.field, { textAlign: "center", fontSize: 22, letterSpacing: 8 }]} accessibilityLabel="PIN del comprador" />
              <Button title="Confirmar entrega" onPress={() => rpc("complete_operation")} />
            </>
          )}
          <Button title="Cancelar operación" kind="ghost" onPress={() => rpc("cancel_operation")} />
        </>
      )}

      {op.status === "completada" && !rated && (
        <View style={[s.card, { gap: 10 }]}>
          <Text style={s.h2}>Calificá al {ratedRole === "seller" ? "vendedor" : "comprador"}</Text>
          <View style={{ flexDirection: "row" }} accessibilityRole="radiogroup">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setScore(n)} accessibilityRole="radio" accessibilityLabel={`${n} estrellas`} accessibilityState={{ selected: score === n }}>
                <Text style={{ fontSize: 40, color: n <= score ? c.ink : c.line }}>★</Text>
              </Pressable>
            ))}
          </View>
          {Object.entries(RATING_CRITERIA[ratedRole]).map(([k, label]) => (
            <Pressable key={k} onPress={() => setCriteria({ ...criteria, [k]: !criteria[k] })} accessibilityRole="checkbox" accessibilityState={{ checked: !!criteria[k] }}>
              <Text style={s.body}>{criteria[k] ? "☑" : "☐"} {label}</Text>
            </Pressable>
          ))}
          <TextInput value={comment} onChangeText={setComment} multiline maxLength={600} placeholder="Comentario (opcional, público)" style={[s.field, { height: 80, paddingTop: 10 }]} />
          <Button title="Enviar calificación" onPress={rate} />
          <Text style={s.soft}>Se publica cuando la otra parte también califique, o en 14 días.</Text>
        </View>
      )}
      {op.status === "completada" && rated && <Text style={s.body}>Operación completada. ¡Gracias por calificar!</Text>}
      {op.status === "cancelada" && <Text style={s.body}>Operación cancelada.</Text>}
      {err && <Text style={s.error}>{err}</Text>}
    </ScrollView>
  );
}
