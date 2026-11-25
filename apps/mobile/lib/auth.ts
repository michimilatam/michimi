import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

/**
 * Registro / ingreso con Google (Android e iOS).
 * Abre el flujo OAuth de Supabase en el navegador del sistema y vuelve por el
 * deep link michimi://auth/callback con un code PKCE que canjeamos por sesión.
 */
export async function signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
  const redirectTo = Linking.createURL("auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { ok: false, error: error?.message ?? "No se pudo iniciar Google" };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return { ok: false, error: "Ingreso cancelado" };

  const code = new URL(result.url).searchParams.get("code");
  if (!code) return { ok: false, error: "Google no devolvió el código" };
  const ex = await supabase.auth.exchangeCodeForSession(code);
  return ex.error ? { ok: false, error: ex.error.message } : { ok: true };
}

export async function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: Linking.createURL("auth/callback") } });
}
