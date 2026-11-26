import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ClaimButton } from "./ClaimButton";

export const metadata: Metadata = { title: "Reclamá tu tienda", robots: { index: false } };

export default async function Reclamar({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("store_invite_info", { p_code: code });
  const inv = (data as { name: string; slug: string; status: string; products: number }[] | null)?.[0];
  if (!inv || inv.status === "descartada") notFound();
  const { data: auth } = await supabase.auth.getUser();
  const { data: me } = auth.user ? await supabase.from("profiles").select("store_slug").eq("id", auth.user.id).maybeSingle() : { data: null };
  const yaEsMia = me?.store_slug === inv.slug;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">Tu tienda {inv.name} en Michimi</h1>
      <p className="text-[15px]">Te reservamos una tienda gratis en <b>michimi.com/tienda/{inv.slug}</b>. Durante el piloto no cobramos comisión ni mensualidad, y te ayudamos a cargar el catálogo.</p>
      {inv.products > 0 && (
        <p className="rounded-card bg-lima/30 p-4 text-[15px]"><b>Ya te preparamos {inv.products} productos</b> tomados de tu web. Al reclamar la tienda los revisás, corregís lo que haga falta y publicás los que quieras. Nada se muestra sin tu confirmación. <Link href={`/reclamar/${code}/vista`} className="font-semibold underline">Ver cómo quedaría mi tienda</Link></p>
      )}
      <ul className="space-y-2 rounded-card border border-line bg-card p-4 text-[15px]">
        <li>• Sello <b>Comercio</b> en tu perfil y en cada publicación.</li>
        <li>• Página propia con todos tus productos, lista para compartir.</li>
        <li>• Consultas y ofertas por el chat de Michimi, con entrega protegida por PIN.</li>
        <li>• Estadísticas de visitas, favoritos y consultas de cada producto.</li>
      </ul>
      {yaEsMia ? (
        <Link href={`/tienda/${inv.slug}`} className="btn-primary">Ver mi tienda</Link>
      ) : inv.status === "reclamada" ? (
        <p className="rounded-card border border-line p-4 text-ink-soft">Esta tienda ya fue reclamada. Si sos el dueño y no fuiste vos, escribinos a comercios@michimi.com.</p>
      ) : auth.user ? (
        <ClaimButton code={code} next={inv.products > 0 ? "/tienda/mi-catalogo" : null} />
      ) : (
        <Link href={`/ingresar?next=${encodeURIComponent(`/reclamar/${code}`)}`} className="btn-primary">Ingresá para reclamarla</Link>
      )}
      <p className="text-xs text-ink-soft">Al reclamarla, el nombre de tu perfil pasa a ser el de la tienda. ¿Dudas? comercios@michimi.com</p>
    </div>
  );
}
