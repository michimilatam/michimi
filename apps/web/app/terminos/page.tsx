import type { Metadata } from "next";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function Terminos() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-[15px] leading-relaxed">
      <h1 className="text-3xl font-bold">Términos y condiciones</h1>
      <p className="text-ink-soft">Última actualización: 25 de noviembre de 2026</p>

      <h2 className="text-xl font-semibold">Qué es Michimi</h2>
      <p>Michimi es una plataforma que conecta personas que quieren comprar y vender productos entre sí. Michimi no es parte de la compraventa: no es dueño de los productos, no los inspecciona y, en esta versión, no procesa pagos.</p>

      <h2 className="text-xl font-semibold">Tu cuenta</h2>
      <p>Tenés que ser mayor de 18 años. Sos responsable de la información que publicás y de lo que pasa con tu cuenta. Una persona, una cuenta.</p>

      <h2 className="text-xl font-semibold">Publicaciones</h2>
      <p>Solo podés publicar productos que te pertenecen y que existen. Las fotos deben ser del producto real y la descripción debe incluir los defectos que conozcas. Está prohibido publicar artículos ilegales, robados, falsificados, armas, drogas, animales o cualquier cosa cuya venta esté prohibida por la ley paraguaya.</p>

      <h2 className="text-xl font-semibold">Ofertas y operaciones</h2>
      <p>Una oferta aceptada reserva el producto y crea una operación. La operación se completa cuando el comprador entrega su PIN al vendedor al recibir el producto. Recomendamos revisar el producto antes de pagar y de dar el PIN, y encontrarse en lugares públicos.</p>

      <h2 className="text-xl font-semibold">Calificaciones</h2>
      <p>Solo pueden calificar las partes de una operación completada. Las calificaciones deben ser honestas. Podemos eliminar calificaciones que contengan insultos, datos personales o sean producto de manipulación.</p>

      <h2 className="text-xl font-semibold">Sanciones</h2>
      <p>Podemos pausar publicaciones o suspender cuentas ante fraude, reportes reiterados o incumplimiento de estos términos. Podés apelar escribiendo a luisfernandomorales@gmail.com.</p>

      <h2 className="text-xl font-semibold">Responsabilidad</h2>
      <p>Cada operación es un acuerdo entre comprador y vendedor. Michimi no garantiza el estado de los productos ni el cumplimiento de las partes, aunque trabaja para prevenir fraudes y protege la información de las operaciones como evidencia.</p>

      <h2 className="text-xl font-semibold">Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República del Paraguay.</p>
    </article>
  );
}
