"use client";
import { useState } from "react";

const SITE = "https://www.michimi.com";

/** Compartir en redes. En el celular usa el menú nativo (Instagram, TikTok, etc. aparecen ahí). */
export function ShareButtons({ path, title, compact = false }: { path: string; title: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const url = `${SITE}${path}`;
  const text = `${title} en Michimi`;
  const e = encodeURIComponent;
  const links = [
    { name: "WhatsApp", href: `https://wa.me/?text=${e(`${text} ${url}`)}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}` },
    { name: "X", href: `https://x.com/intent/post?text=${e(text)}&url=${e(url)}` },
    { name: "Telegram", href: `https://t.me/share/url?url=${e(url)}&text=${e(text)}` },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}` },
  ];
  async function native() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: text, url }); } catch { /* cancelado */ }
    } else setOpen((o) => !o);
  }
  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const chip = "inline-flex h-9 items-center rounded-full border border-line bg-card px-3 text-sm hover:border-ink";
  const list = (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" className={chip}>{l.name}</a>)}
      <button type="button" onClick={copy} className={chip}>{copied ? "¡Copiado!" : "Copiar link"}</button>
    </div>
  );
  if (compact) {
    return (
      <div className="relative">
        <button type="button" onClick={native} className="btn-ghost h-9 px-3 text-sm">Compartir</button>
        {open && <div className="absolute right-0 z-10 mt-2 w-72 rounded-card border border-line bg-card p-3 shadow-lg">{list}</div>}
      </div>
    );
  }
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Compartir</h2>
        <button type="button" onClick={native} className="text-sm underline md:hidden">Más opciones</button>
      </div>
      {list}
    </section>
  );
}
