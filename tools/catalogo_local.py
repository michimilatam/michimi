#!/usr/bin/env python3
"""
Michimi · Armador de catálogos local (Ollama)
==============================================

Lee la web pública de cada comercio invitado, arma su catálogo preliminar y lo
carga en Michimi como productos PENDIENTES (nadie los ve hasta que el comercio
reclama su tienda y los publica). Así se llena la vista previa
michimi.com/reclamar/<código>/vista sin gastar tokens de Claude.

Cómo busca los productos, de lo más barato a lo más caro:
  1. Tienda Shopify          -> /products.json            (sin IA)
  2. WooCommerce             -> /wp-json/wc/store/v1/...  (sin IA)
  3. Páginas con datos de producto (JSON-LD de Google)   (sin IA)
  4. Páginas sin datos estructurados -> Ollama extrae título, precio, foto
  La IA local también clasifica cada producto en una subcategoría de Michimi.

Respeta robots.txt, va despacio (1 página por segundo) y NO toca Instagram ni
Facebook (sus condiciones lo prohíben).

Requisitos (una sola vez):
  1. Python 3.10 o más nuevo.
  2. Ollama: https://ollama.com/download  y después:  ollama pull qwen2.5:7b
     (PC con poca memoria: ollama pull qwen2.5:3b y usá --modelo qwen2.5:3b)
  3. Variables de entorno (las pegás vos, nunca las compartas):
       MICHIMI_SUPABASE_URL   = https://laxhbuvufcugacvisavb.supabase.co
       MICHIMI_SERVICE_KEY    = la "service_role key" de Supabase
                               (Project Settings -> API Keys)

Uso:
  python catalogo_local.py --codigo 8573e9c454 --web prolarshop.com.py
  python catalogo_local.py --codigo 8573e9c454 --web prolarshop.com.py --solo-ver
  python catalogo_local.py --todos            (procesa todas las invitaciones con web cargada)

  --solo-ver   no carga nada en Michimi; guarda catalogo_<codigo>.json para revisar.
  --max N      máximo de productos por comercio (por defecto 300).
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET

UA = "MichimiCatalogBot/1.0 (+https://www.michimi.com; comercios@michimi.com)"
OLLAMA = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
PAUSA = 1.0  # segundos entre pedidos a la misma web

SUBCATEGORIAS = {
    "living-y-comedor": "Living y comedor (sofás, sillones, mesas, sillas, racks, aparadores)",
    "dormitorio": "Dormitorio (camas, cabeceras, mesas de luz, placares, cómodas)",
    "cocina-y-vajilla": "Cocina y vajilla (platos, tazas, ollas, utensilios)",
    "bano": "Baño (griferías, accesorios de baño)",
    "decoracion": "Decoración (cuadros, espejos, jarrones, adornos, velas)",
    "iluminacion": "Iluminación (lámparas, apliques, luminarias)",
    "colchones-y-textiles": "Colchones y textiles (colchones, almohadas, sábanas, cortinas, alfombras, almohadones)",
    "jardin-y-exterior": "Jardín y exterior (plantas, macetas, herramientas de jardín, muebles de exterior)",
    "piletas-y-accesorios": "Piletas y accesorios",
}

REGLAS = [
    (r"maceta|planta|jard[ií]n|exterior|vivero|semilla|abono|sustrato|riego|c[eé]sped|suculenta|cactus|orqu[ií]dea", "jardin-y-exterior"),
    (r"l[aá]mpara|luminaria|aplique|plaf[oó]n|velador|foco|led\b|ilumin", "iluminacion"),
    (r"colch[oó]n|almohad|s[aá]bana|edred[oó]n|manta|cortina|alfombra|toalla|textil|funda", "colchones-y-textiles"),
    (r"cama|cabecera|mesa de luz|placard|ropero|c[oó]moda|dormitorio|respaldo", "dormitorio"),
    (r"sof[aá]|sill[oó]n|silla|mesa|rack|aparador|biblioteca|estante|banqueta|taburete|living|comedor|puff|butaca", "living-y-comedor"),
    (r"vajilla|plato|taza|vaso|copa|cubierto|olla|sart[eé]n|cocina|bandeja|frasco", "cocina-y-vajilla"),
    (r"ba[nñ]o|grifer[ií]a|ducha|bacha|lavatorio", "bano"),
    (r"pileta|piscina", "piletas-y-accesorios"),
]


# ---------------------------------------------------------------- utilidades
def log(*a):
    print(*a, flush=True)


def origen(web: str) -> str:
    if not re.match(r"^https?://", web):
        web = "https://" + web
    u = urllib.parse.urlparse(web)
    return f"{u.scheme}://{u.netloc}"


class Web:
    """Pide páginas respetando robots.txt y con pausa entre pedidos."""

    def __init__(self, base: str):
        self.base = base
        self.rp = urllib.robotparser.RobotFileParser()
        try:
            self.rp.set_url(base + "/robots.txt")
            self.rp.read()
        except Exception:
            self.rp = None
        self.ultimo = 0.0

    def permitido(self, url: str) -> bool:
        return self.rp is None or self.rp.can_fetch(UA, url) or self.rp.can_fetch("*", url)

    def get(self, url: str, json_ok=False) -> str | None:
        if not self.permitido(url):
            log(f"   robots.txt no permite: {url}")
            return None
        espera = PAUSA - (time.time() - self.ultimo)
        if espera > 0:
            time.sleep(espera)
        self.ultimo = time.time()
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json" if json_ok else "text/html,*/*"})
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.read().decode(r.headers.get_content_charset() or "utf-8", "replace")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            log(f"   no se pudo leer {url}: {e}")
            return None


def limpiar_html(s: str | None) -> str:
    s = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", s or "", flags=re.S | re.I)
    s = re.sub(r"<(br|/p|/li|/div|/h\d)[^>]*>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    s = re.sub(r"[ \t\r]+", " ", s)
    return re.sub(r"\n\s*\n+", "\n", s).strip()


def a_guaranies(v) -> int | None:
    """'Gs. 1.250.000', '1250000.00', 1250000 -> 1250000"""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        n = int(round(v))
    else:
        t = str(v).strip()
        t = re.sub(r"[^\d,\.]", "", t)
        if not t:
            return None
        # decimales con punto o coma al final (2 dígitos): se descartan
        t = re.sub(r"[\.,]\d{1,2}$", "", t)
        t = re.sub(r"[\.,]", "", t)
        n = int(t) if t.isdigit() else None
    return n if n and n >= 1000 else None  # en guaraníes nada cuesta menos de 1.000


def subcat_por_reglas(texto: str) -> str | None:
    for pat, sub in REGLAS:
        if re.search(pat, texto, re.I):
            return sub
    return None


# ---------------------------------------------------------------- Ollama
def ollama(modelo: str, prompt: str) -> dict | None:
    body = json.dumps({"model": modelo, "prompt": prompt, "format": "json", "stream": False,
                       "options": {"temperature": 0}}).encode()
    req = urllib.request.Request(OLLAMA + "/api/generate", data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(json.loads(r.read())["response"])
    except Exception as e:
        log(f"   Ollama falló: {e}")
        return None


def clasificar(modelo: str, titulo: str, desc: str) -> str:
    sub = subcat_por_reglas(titulo)
    if sub:
        return sub
    opciones = "\n".join(f"- {k}: {v}" for k, v in SUBCATEGORIAS.items())
    r = ollama(modelo, f"""Clasificá este producto de una tienda de hogar en UNA subcategoría.
Producto: {titulo}
Descripción: {desc[:400]}
Subcategorías:
{opciones}
Respondé solo JSON: {{"subcategoria": "<clave>"}}""")
    sub = (r or {}).get("subcategoria")
    return sub if sub in SUBCATEGORIAS else (subcat_por_reglas(desc) or "decoracion")


def extraer_con_ia(modelo: str, url: str, pagina: str) -> dict | None:
    texto = limpiar_html(pagina)[:6000]
    imgs = re.findall(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', pagina)
    imgs += re.findall(r'<img[^>]+src=["\'](https?://[^"\']+\.(?:jpe?g|png|webp)[^"\']*)', pagina, re.I)
    r = ollama(modelo, f"""Esta es una página de una tienda online paraguaya. Si muestra UN producto a la venta,
extraé sus datos. Si es una lista, una categoría, un blog o no hay producto, respondé {{"es_producto": false}}.
NO inventes nada: si un dato no está en el texto, poné null.

URL: {url}
Texto de la página:
{texto}

Respondé solo JSON:
{{"es_producto": true, "titulo": "...", "precio_guaranies": 0, "descripcion": "...", "disponible": true}}""")
    if not r or not r.get("es_producto") or not r.get("titulo"):
        return None
    return {
        "title": str(r["titulo"]).strip(),
        "price_amount": a_guaranies(r.get("precio_guaranies")),
        "description": (r.get("descripcion") or "").strip(),
        "image_urls": list(dict.fromkeys(imgs))[:6],
        "available": r.get("disponible") is not False,
    }


# ---------------------------------------------------------------- fuentes
def desde_shopify(w: Web, maximo: int) -> list[dict] | None:
    out = []
    for page in range(1, 5):
        t = w.get(f"{w.base}/products.json?limit=250&page={page}", json_ok=True)
        if not t:
            return out or None
        try:
            prods = json.loads(t).get("products")
        except json.JSONDecodeError:
            return out or None
        if prods is None:
            return out or None
        if not prods:
            break
        for p in prods:
            if not any(v.get("available", True) for v in p.get("variants", [])) or not p.get("images"):
                continue
            precios = [a_guaranies(v.get("price")) for v in p.get("variants", [])]
            precios = [x for x in precios if x]
            out.append({
                "external_id": f"shopify-{p['id']}", "title": p["title"].strip(),
                "description": limpiar_html(p.get("body_html")), "price_amount": min(precios) if precios else None,
                "image_urls": [i["src"] for i in p["images"][:8]], "source_url": f"{w.base}/products/{p['handle']}",
                "hint": p.get("product_type") or "",
            })
        if len(out) >= maximo:
            break
    return out


def desde_woocommerce(w: Web, maximo: int) -> list[dict] | None:
    out = []
    for page in range(1, 11):
        t = w.get(f"{w.base}/wp-json/wc/store/v1/products?per_page=100&page={page}", json_ok=True)
        if not t:
            return out or None
        try:
            prods = json.loads(t)
        except json.JSONDecodeError:
            return out or None
        if not isinstance(prods, list):
            return out or None
        if not prods:
            break
        for p in prods:
            if not p.get("is_in_stock", True) or not p.get("images"):
                continue
            pr = p.get("prices") or {}
            minor = int(pr.get("currency_minor_unit") or 0)
            precio = a_guaranies(int(pr["price"]) / (10 ** minor)) if pr.get("price") else None
            out.append({
                "external_id": f"woo-{p['id']}", "title": html.unescape(p["name"]).strip(),
                "description": limpiar_html(p.get("description") or p.get("short_description")), "price_amount": precio,
                "image_urls": [i["src"] for i in p["images"][:8]], "source_url": p.get("permalink"),
                "hint": " ".join(c.get("name", "") for c in p.get("categories", [])),
            })
        if len(out) >= maximo:
            break
    return out


def urls_de_sitemap(w: Web, limite: int) -> list[str]:
    pendientes, vistas, urls = [w.base + "/sitemap.xml"], set(), []
    while pendientes and len(urls) < limite * 3:
        sm = pendientes.pop(0)
        if sm in vistas:
            continue
        vistas.add(sm)
        t = w.get(sm)
        if not t:
            continue
        try:
            root = ET.fromstring(t.encode())
        except ET.ParseError:
            continue
        for loc in root.iter():
            if loc.tag.endswith("loc") and loc.text:
                u = loc.text.strip()
                if u.endswith(".xml"):
                    if re.search(r"product|producto|shop|tienda", u, re.I) or len(vistas) < 3:
                        pendientes.append(u)
                else:
                    urls.append(u)
    prod = [u for u in urls if re.search(r"/(product|producto|productos|p|item|shop|tienda)/", u, re.I)]
    return (prod or urls)[: limite * 2]


def producto_jsonld(pagina: str) -> dict | None:
    for bloque in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', pagina, re.S | re.I):
        try:
            data = json.loads(bloque.strip())
        except json.JSONDecodeError:
            continue
        cands = data if isinstance(data, list) else data.get("@graph", [data]) if isinstance(data, dict) else []
        for d in cands:
            if not isinstance(d, dict):
                continue
            tipo = d.get("@type")
            if tipo == "Product" or (isinstance(tipo, list) and "Product" in tipo):
                ofertas = d.get("offers") or {}
                if isinstance(ofertas, list):
                    ofertas = ofertas[0] if ofertas else {}
                img = d.get("image") or []
                img = [img] if isinstance(img, str) else [i if isinstance(i, str) else i.get("url") for i in img]
                disp = str(ofertas.get("availability", "InStock"))
                return {
                    "title": str(d.get("name", "")).strip(), "description": limpiar_html(d.get("description")),
                    "price_amount": a_guaranies(ofertas.get("price") or ofertas.get("lowPrice")),
                    "image_urls": [i for i in img if i][:8], "available": "OutOfStock" not in disp,
                }
    return None


def desde_paginas(w: Web, modelo: str, maximo: int) -> list[dict]:
    urls = urls_de_sitemap(w, maximo)
    if not urls:
        log("   la web no tiene sitemap.xml: no hay forma ordenada de recorrerla")
        return []
    log(f"   {len(urls)} páginas para revisar (1 por segundo)…")
    out = []
    for i, u in enumerate(urls, 1):
        if len(out) >= maximo:
            break
        pag = w.get(u)
        if not pag:
            continue
        p = producto_jsonld(pag) or extraer_con_ia(modelo, u, pag)
        if p and p["title"] and p.get("available", True) and p["image_urls"]:
            p.update(external_id="url-" + hashlib.sha1(u.encode()).hexdigest()[:16], source_url=u, hint="")
            out.append(p)
            log(f"   [{i}/{len(urls)}] ✓ {p['title'][:60]}  {p['price_amount'] or 'sin precio'}")
    return out


# ---------------------------------------------------------------- Supabase
class Michimi:
    def __init__(self):
        self.url = os.environ.get("MICHIMI_SUPABASE_URL", "").rstrip("/")
        self.key = os.environ.get("MICHIMI_SERVICE_KEY", "")
        self.key = self.key.strip().strip('"').strip("'")
        if self.key.startswith("sb_publishable") or "anon" in self._rol():
            sys.exit("Esa es la clave pública (publishable/anon). Necesito la SECRETA: sb_secret_... o service_role.")
        if not self.url or not self.key:
            sys.exit("Faltan MICHIMI_SUPABASE_URL y MICHIMI_SERVICE_KEY (ver instrucciones arriba del archivo).")

    def _rol(self) -> str:
        """Lee el rol de una clave JWT vieja sin validarla (solo para avisar si es la equivocada)."""
        if not self.key.startswith("eyJ"):
            return ""
        try:
            import base64
            parte = self.key.split(".")[1]
            return json.loads(base64.urlsafe_b64decode(parte + "=" * (-len(parte) % 4))).get("role", "")
        except Exception:
            return ""

    def req(self, method: str, path: str, body=None, extra=None):
        # Claves nuevas de Supabase (sb_secret_...) van solo en "apikey";
        # las viejas (JWT que empieza con eyJ) también en Authorization.
        h = {"apikey": self.key, "Content-Type": "application/json", "User-Agent": "michimi-catalogo-local/1.1"}
        if self.key.startswith("eyJ"):
            h["Authorization"] = f"Bearer {self.key}"
        h.update(extra or {})
        r = urllib.request.Request(f"{self.url}/rest/v1/{path}", method=method, headers=h,
                                   data=json.dumps(body).encode() if body is not None else None)
        try:
            with urllib.request.urlopen(r, timeout=60) as resp:
                t = resp.read()
                return json.loads(t) if t else None
        except urllib.error.HTTPError as e:
            detalle = e.read().decode("utf-8", "replace")[:500]
            pista = ""
            if e.code in (401, 403):
                pista = ("\nRevisá MICHIMI_SERVICE_KEY: tiene que ser la clave SECRETA (sb_secret_... o la "
                         "service_role que empieza con eyJ), no la publishable/anon. Y que no tenga espacios ni comillas de más.")
            sys.exit(f"Supabase respondió {e.code}: {detalle}{pista}")

    def invitaciones(self):
        return self.req("GET", "store_invites?select=code,name,website,status&website=not.is.null&status=neq.descartada")

    def cargar(self, codigo: str, productos: list[dict]):
        filas = [{
            "invite_code": codigo, "external_id": p["external_id"], "title": p["title"],
            "description": p["description"] or None, "price_amount": p["price_amount"], "currency": "PYG",
            "category": "muebles", "subcategory": p["subcategory"], "image_urls": p["image_urls"],
            "source_url": p["source_url"],
        } for p in productos]
        for i in range(0, len(filas), 100):
            self.req("POST", "store_products?on_conflict=invite_code,external_id", filas[i:i + 100],
                     {"Prefer": "resolution=ignore-duplicates,return=minimal"})


# ---------------------------------------------------------------- principal
def armar(web: str, modelo: str, maximo: int) -> list[dict]:
    w = Web(origen(web))
    log(f"→ {w.base}")
    prods = desde_shopify(w, maximo)
    if prods:
        log(f"   Shopify: {len(prods)} productos")
    else:
        prods = desde_woocommerce(w, maximo)
        if prods:
            log(f"   WooCommerce: {len(prods)} productos")
        else:
            log("   sin catálogo público: recorro las páginas de producto")
            prods = desde_paginas(w, modelo, maximo)
    vistos, final = set(), []
    for p in prods[:maximo]:
        titulo = re.sub(r"\s+", " ", p["title"])[:90]
        if len(titulo) < 6 or titulo.lower() in vistos:
            continue
        vistos.add(titulo.lower())
        p["title"] = titulo
        p["description"] = (p.get("description") or "")[:4000]
        p["subcategory"] = clasificar(modelo, f"{p.get('hint', '')} {titulo}", p["description"])
        final.append(p)
    con_precio = sum(1 for p in final if p["price_amount"])
    log(f"   listo: {len(final)} productos ({con_precio} con precio)")
    return final


def main():
    ap = argparse.ArgumentParser(description="Arma catálogos preliminares para Michimi con IA local")
    ap.add_argument("--codigo", help="código de la invitación (lo ves en el link /reclamar/<código>)")
    ap.add_argument("--web", help="sitio web del comercio")
    ap.add_argument("--todos", action="store_true", help="todas las invitaciones con web cargada")
    ap.add_argument("--modelo", default="qwen2.5:7b")
    ap.add_argument("--max", type=int, default=300)
    ap.add_argument("--solo-ver", action="store_true", help="no carga en Michimi; guarda un JSON")
    a = ap.parse_args()

    if a.todos:
        m = Michimi()
        trabajos = [(i["code"], i["website"], i["name"]) for i in m.invitaciones()]
    elif a.codigo and a.web:
        m = None if a.solo_ver else Michimi()
        trabajos = [(a.codigo, a.web, a.codigo)]
    else:
        ap.error("usá --codigo y --web, o --todos")

    for codigo, web, nombre in trabajos:
        log(f"\n=== {nombre} ===")
        prods = armar(web, a.modelo, a.max)
        if not prods:
            log("   no se encontraron productos con foto: queda para carga manual")
            continue
        if a.solo_ver:
            archivo = f"catalogo_{codigo}.json"
            with open(archivo, "w", encoding="utf-8") as f:
                json.dump(prods, f, ensure_ascii=False, indent=1)
            log(f"   guardado en {archivo}")
        else:
            m.cargar(codigo, prods)
            log(f"   cargado. Vista previa: https://www.michimi.com/reclamar/{codigo}/vista")


if __name__ == "__main__":
    main()
