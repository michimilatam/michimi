"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Section = "productos" | "servicios" | "pedidos";

function useSection(): Section {
  const path = usePathname();
  const sp = useSearchParams();
  if (path.startsWith("/pedidos")) return "pedidos";
  if (path === "/" && sp.get("tipo") === "servicios") return "servicios";
  return "productos";
}

/** Buscador del header: busca en productos o en servicios según la sección activa. */
export function HeaderSearch() {
  const s = useSection();
  const svc = s !== "productos";
  return (
    <form action="/" className="flex-1">
      {svc && <input type="hidden" name="tipo" value="servicios" />}
      <input
        key={s}
        name="q"
        placeholder={svc ? "Buscá electricistas, clases, fletes…" : "Buscá celulares, muebles, herramientas…"}
        className="h-10 w-full rounded-full bg-white/10 px-4 text-[15px] placeholder:text-white/60 outline-none focus:bg-white focus:text-ink"
      />
    </form>
  );
}

/** Segunda fila del header: qué estás mirando. Siempre visible, en cualquier página. */
export function SectionNav() {
  const s = useSection();
  const item = (key: Section, href: string, label: string) => (
    <Link href={href} aria-current={s === key ? "page" : undefined}
      className={`border-b-2 px-1 pb-2 pt-1 text-[15px] font-semibold ${s === key ? "border-lima text-white" : "border-transparent text-white/60 hover:text-white"}`}>
      {label}
    </Link>
  );
  return (
    <div className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4">
      {item("productos", "/", "Productos")}
      {item("servicios", "/?tipo=servicios", "Servicios")}
      {item("pedidos", "/pedidos", "Pedidos de presupuesto")}
    </div>
  );
}
