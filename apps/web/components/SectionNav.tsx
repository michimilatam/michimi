"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Buscador con selector Productos | Servicios integrado: una sola fila, sin barra extra. */
export function HeaderSearch() {
  const path = usePathname();
  const sp = useSearchParams();
  const svc = (path === "/" && sp.get("tipo") === "servicios") || path.startsWith("/pedidos");
  const mixed = path === "/" && !!sp.get("q") && !sp.get("tipo");
  const seg = (on: boolean) => `rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap ${on ? "bg-lima text-ink" : "text-white/70 hover:text-white"}`;
  return (
    <form action="/" className="order-last flex h-10 w-full items-center gap-1 rounded-full bg-white/10 p-1 focus-within:bg-white focus-within:text-ink md:order-none md:w-auto md:flex-1">
      <span className="flex shrink-0 rounded-full bg-black/30 p-0.5">
        <Link href="/" className={seg(!svc && !mixed)} aria-current={!svc ? "page" : undefined}>Productos</Link>
        <Link href="/?tipo=servicios" className={seg(svc)} aria-current={svc ? "page" : undefined}>Servicios</Link>
      </span>
      <input
        key={String(svc)}
        name="q"
        defaultValue={sp.get("q") ?? ""}
        aria-label="Buscar productos y servicios"
        placeholder="Buscá productos y servicios…"
        className="min-w-0 flex-1 bg-transparent px-2 text-[15px] placeholder:text-white/60 outline-none"
      />
    </form>
  );
}
