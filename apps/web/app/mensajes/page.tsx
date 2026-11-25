/** Panel derecho cuando no hay conversación elegida (en celular se ve solo la lista). */
export default function MensajesIndex() {
  return (
    <div className="hidden h-full flex-col items-center justify-center gap-2 p-8 text-center md:flex">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lima text-2xl" aria-hidden="true">💬</span>
      <p className="text-lg font-semibold">Elegí una conversación</p>
      <p className="max-w-xs text-sm text-ink-soft">A la izquierda tenés tus chats agrupados por producto: los que estás comprando y los que estás vendiendo.</p>
    </div>
  );
}
