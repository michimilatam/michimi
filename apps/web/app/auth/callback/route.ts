import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Vuelta de Google OAuth / enlace mágico: canjea el code por una sesión. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL("/ingresar?error=1", url.origin));
}
