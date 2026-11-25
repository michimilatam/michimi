import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { RoleReputation } from "@/components/ui";
import { c, s } from "@/lib/theme";

type Rating = { score: number; role: "seller" | "buyer"; comment: string | null };

export default function Perfil() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<{ display_name: string; avatar_url: string | null; city: string | null; created_at: string } | null>(null);
  const [rep, setRep] = useState<{ sales_completed: number; purchases_completed: number } | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("display_name,avatar_url,city,created_at").eq("id", id).single().then(({ data }) => setP(data));
    supabase.from("user_reputation").select("sales_completed,purchases_completed").eq("user_id", id).maybeSingle().then(({ data }) => setRep(data));
    supabase.from("ratings").select("score,role,comment").eq("ratee_id", id).then(({ data }) => setRatings((data as Rating[]) ?? []));
  }, [id]);
  if (!p) return null;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        {p.avatar_url ? <Image source={{ uri: p.avatar_url }} style={{ width: 56, height: 56, borderRadius: 28 }} /> : <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.line }} />}
        <View>
          <Text style={s.h2}>{p.display_name}</Text>
          <Text style={s.soft}>{p.city ?? "Paraguay"} · desde {new Date(p.created_at).getFullYear()}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <RoleReputation role="seller" scores={ratings.filter((r) => r.role === "seller").map((r) => r.score)} completed={rep?.sales_completed ?? 0} />
        <RoleReputation role="buyer" scores={ratings.filter((r) => r.role === "buyer").map((r) => r.score)} completed={rep?.purchases_completed ?? 0} />
      </View>
      <Text style={s.soft}>Solo califican personas que completaron una operación con PIN de entrega.</Text>
      {ratings.filter((r) => r.comment).map((r, i) => (
        <View key={i} style={s.card}>
          <Text style={{ fontWeight: "700" }}>{"★".repeat(r.score)} <Text style={s.soft}>{r.role === "seller" ? "como vendedor" : "como comprador"}</Text></Text>
          <Text style={s.body}>{r.comment}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
