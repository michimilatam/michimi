"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { photoUrl } from "@/lib/photo";
import { supabaseBrowser } from "@/lib/supabase/client";

export type ConversationItem = { id: string; otherName: string; otherAvatar: string | null; preview: string; at: string; unread: number };
export type ProductGroup = {
  listingId: string; title: string; status: string; cover: string | null; role: "vendo" | "compro";
  lastAt: string; unread: number; conversations: ConversationItem[];
};

function when(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days < 7) return d.toLocaleDateString("es-PY", { weekday: "short" });
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit" });
}

function Avatar({ name, src, size = 36 }: { name: string; src: string | null; size?: number }) {
  return src ? (
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} referrerPolicy="no-referrer" />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-lima" style={{ width: size, height: size }}>
      {(name.trim()[0] ?? "U").toUpperCase()}
    </span>
  );
}

type Filter = "todo" | "compro" | "vendo";

export function ConversationList({ groups, me }: { groups: ProductGroup[]; me: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeId = pathname.split("/")[2] ?? null;
  const [filter, setFilter] = useState<Filter>("todo");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mensaje nuevo en cualquier conversación → refrescar la lista (agrupado para no recargar de más)
  useEffect(() => {
    const supabase = supabaseBrowser();
    const ch = supabase
      .channel(`inbox:${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 600);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me, router]);

  const shown = groups.filter((g) => filter === "todo" || g.role === filter);

  return (
    <aside className={`min-h-0 flex-col border-r border-line bg-card ${activeId ? "hidden md:flex" : "flex"}`}>
      <div className="border-b border-line px-4 pb-3 pt-4">
        <h1 className="text-xl font-bold">Mensajes</h1>
        <div className="mt-3 flex gap-1 rounded-full bg-paper p-1 text-sm" role="tablist">
          {(["todo", "compro", "vendo"] as const).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
              className={`flex-1 rounded-full py-1.5 font-semibold ${filter === f ? "bg-ink text-lima" : "text-ink-soft hover:text-ink"}`}>
              {f === "todo" ? "Todos" : f === "compro" ? "Comprando" : "Vendiendo"}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {shown.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-soft">
            {filter === "vendo" ? "Cuando alguien consulte por tus productos, aparece acá." : "Cuando consultes o hagas una oferta, la conversación aparece acá."}
          </p>
        )}
        {shown.map((g) => (
          <section key={g.listingId} className="border-b border-line">
            {/* Producto */}
            <Link href={`/publicacion/${g.listingId}`} className="flex items-center gap-3 bg-paper/60 px-4 py-2.5 hover:bg-paper">
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-line">
                {g.cover && <img src={photoUrl(g.cover)} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{g.title}</span>
                <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <span className={`rounded px-1.5 py-px font-semibold ${g.role === "vendo" ? "bg-ink text-lima" : "bg-lima text-ink"}`}>
                    {g.role === "vendo" ? "Vendés" : "Comprás"}
                  </span>
                  {g.role === "vendo" && `${g.conversations.length} ${g.conversations.length === 1 ? "interesado" : "interesados"}`}
                  {g.status !== "activa" && <span>· {g.status}</span>}
                </span>
              </span>
            </Link>
            {/* Personas */}
            <ul>
              {g.conversations.map((c) => {
                const active = c.id === activeId;
                return (
                  <li key={c.id}>
                    <Link href={`/mensajes/${c.id}`} aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 py-2.5 pl-6 pr-4 ${active ? "bg-lima/25" : "hover:bg-paper"}`}>
                      <Avatar name={c.otherName} src={c.otherAvatar} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-[15px] ${c.unread ? "font-bold" : "font-medium"}`}>{c.otherName}</span>
                          <span className={`shrink-0 text-xs ${c.unread ? "font-semibold text-ink" : "text-ink-soft"}`}>{when(c.at)}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span className={`truncate text-sm ${c.unread ? "text-ink" : "text-ink-soft"}`}>{c.preview}</span>
                          {c.unread > 0 && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-lima px-1.5 text-[11px] font-bold text-ink" aria-label={`${c.unread} sin leer`}>
                              {c.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
}
