import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";

/** Destino del deep link michimi://auth/callback (enlace mágico por email). */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  useEffect(() => {
    (async () => {
      if (code) await supabase.auth.exchangeCodeForSession(code);
      router.replace("/");
    })();
  }, [code]);
  return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator /></View>;
}
