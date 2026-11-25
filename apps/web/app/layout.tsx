import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { supabaseServer } from "@/lib/supabase/server";
import { currentCountry } from "@/lib/country";
import { CountryPicker } from "@/components/CountryPicker";
import { MessagesBadge } from "@/components/MessagesBadge";
import { UserMenu } from "@/components/UserMenu";
import { Suspense } from "react";
import { HeaderSearch } from "@/components/SectionNav";

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
  const profile = data.user
    ? (await supabase.from("profiles").select("display_name,avatar_url,is_admin").eq("id", data.user.id).maybeSingle()).data
    : null;
  return (
    <html lang="es-PY">
      <body className="min-h-dvh">
        <header className="sticky top-0 z-20 bg-ink text-white">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:h-16 md:flex-nowrap md:py-0">
            <Link href="/" aria-label="Michimi, inicio" className="mr-auto shrink-0 md:mr-0">
              <img src="/logo-horizontal-oscuro.svg" alt="Michimi" className="h-8 w-auto" />
            </Link>
            <Suspense fallback={<div className="order-last h-10 w-full md:order-none md:flex-1" />}><HeaderSearch /></Suspense>
            {data.user && <MessagesBadge userId={data.user.id} />}
            <Link href="/publicar" className="btn-primary h-10 px-4 text-sm">Vender</Link>
            {data.user ? (
              <UserMenu userId={data.user.id} name={profile?.display_name ?? data.user.email ?? "Usuario"} avatar={profile?.avatar_url ?? null} admin={!!profile?.is_admin} />
            ) : (
              <Link href="/ingresar" className="text-sm">Ingresar</Link>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-4 md:py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink-soft">
          Michimi · Comprá y vendé entre personas, con la confianza de una plataforma que está de tu lado.
          <span className="mt-3 flex flex-wrap items-center gap-4">
            <span className="rounded-full bg-ink"><CountryPicker current={country} /></span>
            <Link href="/privacidad" className="underline">Privacidad</Link>
            <Link href="/terminos" className="underline">Términos</Link>
          </span>
        </footer>
      </body>
    </html>
  );
}
