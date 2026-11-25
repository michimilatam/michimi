"use client";
import { useRouter } from "next/navigation";
import { COUNTRIES, COUNTRY_CODES, COUNTRY_COOKIE, flag, type CountryCode } from "@michimi/core";

/** Selector de país con bandera. Guarda la elección en una cookie (1 año) y recarga. */
export function CountryPicker({ current }: { current: CountryCode }) {
  const router = useRouter();
  return (
    <label className="relative flex items-center">
      <span className="sr-only">País</span>
      <select
        value={current}
        onChange={(e) => {
          document.cookie = `${COUNTRY_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.push("/");
          router.refresh();
        }}
        className="h-10 cursor-pointer appearance-none rounded-full bg-white/10 pl-3 pr-7 text-[15px] text-white outline-none hover:bg-white/20 [&>option]:text-ink"
        aria-label="Elegí tu país"
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c} value={c}>{flag(c)} {COUNTRIES[c].name}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 text-xs text-white/70">▼</span>
    </label>
  );
}
