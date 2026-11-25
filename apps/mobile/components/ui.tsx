import { Pressable, Text, type PressableProps } from "react-native";
import { BADGE_LABEL, summarize } from "@michimi/core";
import { View } from "react-native";
import { c, s } from "@/lib/theme";

export function Button({ title, kind = "primary", ...p }: PressableProps & { title: string; kind?: "primary" | "ghost" }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [s.btn, kind === "primary" ? s.btnPrimary : s.btnGhost, { opacity: pressed || p.disabled ? 0.7 : 1 }]}
      {...p}
    >
      <Text style={s.btnText}>{title}</Text>
    </Pressable>
  );
}

export function RoleReputation({ role, scores, completed }: { role: "seller" | "buyer"; scores: number[]; completed: number }) {
  const r = summarize(scores);
  const tone = r.badge === "en_observacion" ? c.bad : r.badge === "nuevo" ? c.inkSoft : c.ok;
  return (
    <View style={[s.card, { flex: 1 }]}>
      <Text style={s.soft}>{role === "seller" ? "Como vendedor" : "Como comprador"}</Text>
      <Text style={{ fontSize: 30, fontWeight: "700" }}>{r.count ? r.score.toFixed(1) : "—"}<Text style={s.soft}> / 5</Text></Text>
      <Text style={{ color: tone, fontWeight: "600" }}>{BADGE_LABEL[r.badge]}</Text>
      <Text style={s.soft}>{r.count} calif. · {completed} {role === "seller" ? "ventas" : "compras"}</Text>
    </View>
  );
}
