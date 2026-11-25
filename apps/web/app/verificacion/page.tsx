import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { VerificacionForm } from "./VerificacionForm";

export const metadata: Metadata = { title: "Verificar mi identidad" };

export default async function Verificacion() {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/ingresar?next=/verificacion");
  const { data: p } = await supabase.from("profiles").select("professional_status,profession,bio").eq("id", u.user.id).single();
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header>
        <h1 className="text-3xl font-bold">Usuario verificado</h1>
        <p className="text-ink-soft">Revisamos a mano tu documento de identidad. Si está todo bien, tu perfil y tus publicaciones muestran el sello azul de usuario verificado. Si ofrecés servicios, podés sumar tu título o matrícula.</p>
      </header>
      {p?.professional_status === "verificado" ? (
        <p className="rounded-card bg-lima p-4 font-semibold text-ink">Ya sos usuario verificado.</p>
      ) : p?.professional_status === "pendiente" ? (
        <p className="rounded-card border border-line bg-card p-4">Recibimos tu solicitud. La revisamos en 1 a 3 días hábiles.</p>
      ) : (
        <>
          {p?.professional_status === "rechazado" && <p className="rounded-card bg-bad/10 p-4 text-bad">Tu solicitud anterior no se aprobó. Podés volver a enviarla con documentos más legibles.</p>}
          <VerificacionForm userId={u.user.id} profession={p?.profession ?? ""} bio={p?.bio ?? ""} />
        </>
      )}
    </div>
  );
}
