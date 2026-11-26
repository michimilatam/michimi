import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { EditarPerfil } from "./EditarPerfil";
import { DeleteAccount } from "./DeleteAccount";

export const metadata: Metadata = { title: "Editar perfil" };

export default async function Page() {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/ingresar?next=/perfil/editar");
  const { data: p } = await supabase.from("profiles").select("display_name,avatar_url,city,bio,profession,professional_status,country").eq("id", u.user.id).single();
  return <><EditarPerfil userId={u.user.id} initial={p!} /><DeleteAccount /></>;
}
