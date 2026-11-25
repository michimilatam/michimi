import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function Privacidad() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-[15px] leading-relaxed">
      <h1 className="text-3xl font-bold">Política de privacidad</h1>
      <p className="text-ink-soft">Última actualización: 25 de noviembre de 2026</p>

      <h2 className="text-xl font-semibold">Qué datos usamos</h2>
      <p>Cuando entrás con Google o con tu email, recibimos tu nombre, tu dirección de email y tu foto de perfil. Además guardamos lo que vos cargás en Michimi: publicaciones, fotos de productos, mensajes, ofertas, operaciones y calificaciones.</p>

      <h2 className="text-xl font-semibold">Para qué los usamos</h2>
      <p>Solo para que funcione el marketplace: identificarte, mostrar tus publicaciones, permitir la negociación entre comprador y vendedor, registrar operaciones y calcular tu reputación. No vendemos ni alquilamos tus datos a terceros, ni los usamos para publicidad de terceros.</p>

      <h2 className="text-xl font-semibold">Qué es público y qué no</h2>
      <p>Es público tu nombre visible, tu foto, tus publicaciones activas, tu reputación como vendedor y como comprador, y los comentarios de calificaciones. Nunca mostramos tu email ni tu teléfono. Los mensajes del chat solo los ven las dos partes de la conversación.</p>

      <h2 className="text-xl font-semibold">Dónde se guardan</h2>
      <p>Los datos se alojan en Supabase (infraestructura en la nube) con acceso restringido por reglas de seguridad a nivel de base de datos.</p>

      <h2 className="text-xl font-semibold">Tus derechos</h2>
      <p>Podés pedir una copia de tus datos, corregirlos o eliminar tu cuenta escribiendo a luisfernandomorales@gmail.com. Al eliminar la cuenta borramos tus datos personales; las calificaciones ya publicadas pueden conservarse de forma anónima para no alterar la reputación de terceros.</p>

      <h2 className="text-xl font-semibold">Contacto</h2>
      <p>Por consultas sobre privacidad: luisfernandomorales@gmail.com.</p>
    </article>
  );
}
