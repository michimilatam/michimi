import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { supabaseServer } from "@/lib/supabase/server";
import { currentCountry } from "@/lib/country";
import { CountryPicker } from "@/components/CountryPicker";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.michimi.com"),
  title: { default: "Michimi — Comprá y vendé entre personas", template: "%s · Michimi" },
  description: "El marketplace de segunda mano confiable. Reputación real, ofertas concretas y entrega con código.",
  openGraph: { images: ["/og-image-1200x630.png"], locale: "es_PY", siteName: "Michimi" },
  icons: { icon: "/favicon.ico", apple: "/favicon-180.png" },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#111111" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const country = await currentCountry();
  return (
    <html lang="es-PY">
      <body className="min-h-dvh">
        <header className="sticky top-0 z-20 bg-ink text-white">
          <nav className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
            <Link href="/" aria-label="Michimi, inicio" className="shrink-0">
              <img src="/logo-horizontal-oscuro.svg" alt="Michimi" className="h-8 w-auto" />
            </Link>
            <CountryPicker current={country} />
            <form action="/" className="flex-1">
              <input
                name="q"
                placeholder="Buscá celulares, muebles, herramientas…"
                className="h-10 w-full rounded-full bg-white/10 px-4 text-[15px] placeholder:text-white/60 outline-none focus:bg-white focus:text-ink"
              />
            </form>
            {data.user ? (
              <>
                <Link href="/mensajes" className="hidden text-sm sm:block">Mensajes</Link>
                <Link href={`/perfil/${data.user.id}`} className="hidden text-sm sm:block">Mi perfil</Link>
              </>
            ) : (
              <Link href="/ingresar" className="text-sm">Ingresar</Link>
            )}
            <Link href="/publicar" className="btn-primary h-10 px-4 text-sm">Vender</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink-soft">
          Michimi · Comprá y vendé entre personas, con la confianza de una plataforma que está de tu lado.
          <span className="mt-2 flex gap-4">
            <Link href="/privacidad" className="underline">Privacidad</Link>
            <Link href="/terminos" className="underline">Términos</Link>
          </span>
        </footer>
      </body>
    </html>
  );
}
