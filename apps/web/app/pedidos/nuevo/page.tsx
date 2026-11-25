import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { currentCountry } from "@/lib/country";
import { NuevoPedido } from "./NuevoPedido";

export const metadata: Metadata = { title: "Pedir presupuestos" };

export default async function Page() {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/ingresar?next=/pedidos/nuevo");
  return <NuevoPedido country={await currentCountry()} />;
}
