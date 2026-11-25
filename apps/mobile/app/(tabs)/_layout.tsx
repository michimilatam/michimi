import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { c } from "@/lib/theme";

const icon = (glyph: string) => ({ color }: { color: ColorValue }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;

export default function TabsLayout() {
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
      <Tabs.Screen name="mensajes" options={{ title: "Mensajes", tabBarIcon: icon("✉") }} />
      <Tabs.Screen name="cuenta" options={{ title: "Cuenta", tabBarIcon: icon("◉") }} />
    </Tabs>
  );
}
