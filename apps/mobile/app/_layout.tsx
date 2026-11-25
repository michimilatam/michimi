import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { c } from "@/lib/theme";

export default function Root() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.ink },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: c.paper },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ingresar" options={{ title: "Ingresar", presentation: "modal" }} />
        <Stack.Screen name="publicacion/[id]" options={{ title: "Publicación" }} />
        <Stack.Screen name="mensajes/[id]" options={{ title: "Conversación" }} />
        <Stack.Screen name="operacion/[id]" options={{ title: "Operación" }} />
        <Stack.Screen name="perfil/[id]" options={{ title: "Perfil" }} />
      </Stack>
    </>
  );
}
