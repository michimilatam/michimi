import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { Button } from "@/components/ui";
import { s } from "@/lib/theme";

export default function Ingresar() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function google() {
    setErr(null);
    const r = await signInWithGoogle();
    if (r.ok) router.back(); else setErr(r.error ?? "Error");
  }
  async function magic() {
    const { error } = await signInWithEmail(email);
    if (error) setErr(error.message); else setMsg(`Te mandamos un enlace a ${email}.`);
  }

  return (
    <View style={[s.screen, s.pad]}>
      <Text style={s.h1}>Entrá a Michimi</Text>
      <Text style={s.soft}>Una sola cuenta para comprar y vender. Tu reputación se construye en cada operación.</Text>
      <Button title="Continuar con Google" kind="ghost" onPress={google} />
      <Text style={[s.soft, { textAlign: "center" }]}>o con tu email</Text>
      {msg ? <Text style={s.body}>{msg}</Text> : (
        <>
          <TextInput value={email} onChangeText={setEmail} placeholder="tu@email.com" autoCapitalize="none" keyboardType="email-address" style={s.field} accessibilityLabel="Email" />
          <Button title="Recibir enlace de ingreso" onPress={magic} />
        </>
      )}
      {err && <Text style={s.error}>{err}</Text>}
    </View>
  );
}
