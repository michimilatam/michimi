/** Convierte productos públicos de una tienda Shopify en borradores para Michimi. */

type ShopifyProduct = {
  id: number; title: string; body_html: string | null; handle: string; product_type: string | null;
  variants: { price: string; available?: boolean }[]; images: { src: string }[];
};

export type DraftProduct = {
  external_id: string; title: string; description: string | null; price_amount: number | null;
  category: string; subcategory: string; image_urls: string[]; source_url: string;
};

const RULES: [RegExp, string][] = [
  [/maceta|planta|jard[ií]n|exterior|vivero|semilla|abono|sustrato|riego|c[eé]sped|suculenta|cactus|orqu[ií]dea/i, "jardin-y-exterior"],
  [/l[aá]mpara|luminaria|aplique|plaf[oó]n|velador|foco|led|ilumin/i, "iluminacion"],
  [/colch[oó]n|almohad|s[aá]bana|edred[oó]n|manta|cortina|alfombra|toalla|textil|almohad[oó]n|funda/i, "colchones-y-textiles"],
  [/cama|cabecera|mesa de luz|mesita de noche|placard|ropero|c[oó]moda|dormitorio|respaldo/i, "dormitorio"],
  [/sof[aá]|sill[oó]n|silla|mesa|rack|aparador|biblioteca|estante|banqueta|taburete|living|comedor|puff|butaca|modular/i, "living-y-comedor"],
  [/vajilla|plato|taza|vaso|copa|cubierto|olla|sart[eé]n|cocina|bandeja|frasco/i, "cocina-y-vajilla"],
  [/ba[nñ]o|grifer[ií]a|ducha|bacha|lavatorio|inodoro/i, "bano"],
  [/pileta|piscina/i, "piletas-y-accesorios"],
];

export function guessSub(text: string): string {
  for (const [re, sub] of RULES) if (re.test(text)) return sub;
  return "decoracion";
}

function stripHtml(html: string | null): string {
  return (html ?? "")
    .replace(/<(br|\/p|\/li|\/div)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

export function siteOrigin(website: string): string {
  const u = new URL(/^https?:\/\//.test(website) ? website : `https://${website}`);
  return `https://${u.hostname}`;
}

export async function fetchShopifyCatalog(website: string, max = 500): Promise<DraftProduct[]> {
  const origin = siteOrigin(website);
  const out: DraftProduct[] = [];
  for (let page = 1; out.length < max && page <= 4; page++) {
    const r = await fetch(`${origin}/products.json?limit=250&page=${page}`, { headers: { "user-agent": "MichimiCatalogBot/1.0 (+https://www.michimi.com; comercios@michimi.com)", accept: "application/json" } });
    if (!r.ok) { if (page === 1) throw new Error(`La web respondió ${r.status}. Puede que no sea una tienda Shopify.`); break; }
    const j = (await r.json().catch(() => null)) as { products?: ShopifyProduct[] } | null;
    if (!j?.products) { if (page === 1) throw new Error("La web no expone un catálogo público (no es Shopify)."); break; }
    if (!j.products.length) break;
    for (const p of j.products) {
      const available = p.variants.some((v) => v.available !== false);
      if (!available || !p.images?.length) continue;
      const prices = p.variants.map((v) => Math.round(Number(v.price))).filter((n) => n > 0);
      const title = p.title.trim().slice(0, 90);
      if (title.length < 6) continue;
      out.push({
        external_id: String(p.id),
        title,
        description: stripHtml(p.body_html).slice(0, 4000) || null,
        price_amount: prices.length ? Math.min(...prices) : null,
        category: "muebles",
        subcategory: guessSub(`${p.product_type ?? ""} ${p.title}`),
        image_urls: p.images.slice(0, 8).map((i) => i.src),
        source_url: `${origin}/products/${p.handle}`,
      });
    }
  }
  return out.slice(0, max);
}
