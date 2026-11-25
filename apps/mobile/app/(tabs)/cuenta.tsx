import { Text, View } from "react-native";
import { router } from "expo-router";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { s } from "@/lib/theme";

export default function Cuenta() {
  const { user, ready } = useSession();
  if (!ready) return null;
  if (!user) {
    return (
      <View style={[s.screen, s.pad]}>
        <Text style={s.h1}>Tu cuenta</Text>
        <Text style={s.soft}>Ingresá para publicar, ofertar y calificar.</Text>
        <Button title="Ingresar" onPress={() => router.push("/ingresar")} />
      </View>
    );
  }
  return (
    <View style={[s.screen, s.pad]}>
      <Text style={s.h1}>{(user.user_metadata.full_name as string) ?? user.email}</Text>
      <Button title="Ver mi perfil y reputación" kind="ghost" onPress={() => router.push(`/perfil/${user.id}`)} />
      <Button title="Cerrar sesión" kind="ghost" onPress={() => supabase.auth.signOut()} />
    </View>
  );
}
