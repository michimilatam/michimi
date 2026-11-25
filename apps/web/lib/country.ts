import { cookies } from "next/headers";
import { COUNTRY_COOKIE, DEFAULT_COUNTRY, isCountry, type CountryCode } from "@michimi/core";

/** País elegido por el visitante (cookie). Paraguay si no eligió nada. */
export async function currentCountry(): Promise<CountryCode> {
  const v = (await cookies()).get(COUNTRY_COOKIE)?.value;
  return isCountry(v) ? v : DEFAULT_COUNTRY;
}
