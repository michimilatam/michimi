import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { c } from "@/lib/theme";
import { useSession } from "@/lib/useSession";
import { useUnread } from "@/lib/useUnread";

const icon = (glyph: string) => ({ color }: { color: ColorValue }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;

export default function TabsLayout() {
  const { user } = useSession();
  const unread = useUnread(user?.id ?? null);
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.ink },
        headerTintColor: "#fff",
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.inkSoft,
        tabBarStyle: { borderTopColor: c.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Explorar", tabBarIcon: icon("⌕") }} />
      <Tabs.Screen name="publicar" options={{ title: "Vender", tabBarIcon: icon("＋") }} />
      <Tabs.Screen name="mensajes" options={{ title: "Mensajes", tabBarIcon: icon("✉"), tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined, tabBarBadgeStyle: { backgroundColor: c.lima, color: c.ink, fontWeight: "700" } }} />
      <Tabs.Screen name="cuenta" options={{ title: "Cuenta", tabBarIcon: icon("◉") }} />
    </Tabs>
  );
}
