import { StyleSheet } from "react-native";

/** Mismos tokens que la web (ver DESIGN.md). */
export const c = {
  ink: "#111111",
  inkSoft: "#4a4a45",
  paper: "#fafaf7",
  card: "#ffffff",
  line: "#e7e6df",
  lima: "#c6f432",
  ok: "#1f7a4d",
  warn: "#a65a00",
  bad: "#b42318",
};

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  pad: { padding: 16, gap: 12 },
  h1: { fontSize: 26, fontWeight: "700", color: c.ink },
  h2: { fontSize: 18, fontWeight: "600", color: c.ink },
  body: { fontSize: 15, color: c.ink, lineHeight: 21 },
  soft: { fontSize: 13, color: c.inkSoft },
  price: { fontSize: 22, fontWeight: "700", color: c.ink, fontVariant: ["tabular-nums"] },
  card: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: 14 },
  field: { height: 46, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 },
  btn: { height: 48, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, flexDirection: "row", gap: 8 },
  btnPrimary: { backgroundColor: c.lima },
  btnGhost: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
  btnText: { fontSize: 16, fontWeight: "600", color: c.ink },
  error: { color: c.bad, fontSize: 14 },
});
