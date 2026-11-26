import { cookies } from "next/headers";
import { COUNTRY_COOKIE, DEFAULT_COUNTRY, isCountry, type CountryCode } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * País activo: 1) el que el visitante eligió en el pie (cookie),
 * 2) el país de su perfil si está logueado, 3) Paraguay.
 */
export async function currentCountry(): Promise<CountryCode> {
  const v = (await cookies()).get(COUNTRY_COOKIE)?.value;
  if (isCountry(v)) return v;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (u.user) {
    const { data: p } = await supabase.from("profiles").select("country").eq("id", u.user.id).maybeSingle();
    if (isCountry(p?.country)) return p.country;
  }
  return DEFAULT_COUNTRY;
}
