"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Avatar con menú: perfil, mensajes y cerrar sesión. */
export function UserMenu({ userId, name, avatar, admin = false }: { userId: string; name: string; avatar: string | null; admin?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  async function signOut() {
    setBusy(true);
    await supabaseBrowser().auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const initial = (name.trim()[0] ?? "U").toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Menú de usuario"
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/15 font-semibold hover:ring-2 hover:ring-lima">
        {avatar ? <img src={avatar} alt="" width={40} height={40} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 w-56 overflow-hidden rounded-card border border-line bg-card text-ink shadow-lg">
          <p className="truncate border-b border-line px-4 py-3 text-sm font-semibold">{name}</p>
          <Link role="menuitem" href={`/perfil/${userId}`} onClick={() => setOpen(false)} className="block px-4 py-2.5 text-[15px] hover:bg-paper">Mi perfil y reputación</Link>
          <Link role="menuitem" href="/mis-publicaciones" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-[15px] hover:bg-paper">Mis publicaciones</Link>
          <Link role="menuitem" href="/favoritos" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-[15px] hover:bg-paper">Favoritos</Link>
          <Link role="menuitem" href="/busquedas" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-[15px] hover:bg-paper">Búsquedas guardadas</Link>
          {admin && <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-[15px] font-semibold hover:bg-paper">Panel de administrador</Link>}
          <Link role="menuitem" href="/mensajes" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-[15px] hover:bg-paper">Mensajes</Link>
          <Link role="menuitem" href="/publicar" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-[15px] hover:bg-paper">Publicar</Link>
          <Link role="menuitem" href="/pedidos" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-[15px] hover:bg-paper">Pedidos de presupuesto</Link>
          <Link role="menuitem" href="/verificacion" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-[15px] hover:bg-paper">Verificar mi identidad</Link>
          <button role="menuitem" onClick={signOut} disabled={busy} className="block w-full border-t border-line px-4 py-2.5 text-left text-[15px] text-bad hover:bg-paper">
            {busy ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
