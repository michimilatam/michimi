#!/usr/bin/env python3
"""
Michimi · Pipeline de comercios por etapas (para 200+ tiendas, en tu PC)
========================================================================

Usa catalogo_local.py (tiene que estar en la misma carpeta) y Ollama.
Cada etapa guarda su avance en tiendas.csv: si se corta la luz o cerrás la
ventana, volvés a correr la misma etapa y sigue donde quedó.

ETAPAS
  0. plantilla   Crea tiendas.csv vacío con las columnas. Lo llenás vos
                 (nombre, web, instagram, ciudad, rubro). Podés pegar desde Excel.
  1. revisar     Entra a cada web: ¿responde?, ¿qué plataforma usa?, ¿cuántos
                 productos tiene? Sin IA, rápido. Marca apta = si / no.
  2. invitar     Crea la invitación en Michimi para cada tienda apta que no
                 tenga código. Guarda el código en el CSV.
  3. catalogar   Arma el catálogo de las tiendas invitadas, de a --lote por vez
                 (por defecto 20). Es la etapa larga: usa Ollama.
  4. reporte     Genera reporte.csv con link de reclamo, vista previa y cantidad
                 de productos de cada tienda, listo para la etapa de correos.

USO
  python pipeline_tiendas.py plantilla
  python pipeline_tiendas.py revisar
  python pipeline_tiendas.py invitar
  python pipeline_tiendas.py catalogar --lote 20
  python pipeline_tiendas.py reporte

  Opciones: --csv otro.csv   --modelo qwen2.5:3b   --max 300 (productos por tienda)
            --minimo 5 (productos mínimos para considerar apta una tienda)

Variables de entorno: las mismas de catalogo_local.py
  MICHIMI_SUPABASE_URL y MICHIMI_SERVICE_KEY (etapas invitar y catalogar).
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogo_local as cl  # noqa: E402

COLUMNAS = [
    "nombre", "web", "instagram", "telefono", "ciudad", "rubro",          # las llenás vos
    "estado_web", "plataforma", "productos_estimados", "apta",            # etapa 1
    "codigo", "slug",                                                     # etapa 2
    "productos_cargados", "con_precio", "catalogado_el", "error",         # etapa 3
]


# ---------------------------------------------------------------- CSV
def leer(path: str) -> list[dict]:
    if not os.path.exists(path):
        sys.exit(f"No existe {path}. Corré primero: python pipeline_tiendas.py plantilla")
    with open(path, newline="", encoding="utf-8-sig") as f:
        muestra = f.read(4096)
        f.seek(0)
        sep = ";" if muestra.count(";") > muestra.count(",") else ","   # Excel en español usa ;
        filas = list(csv.DictReader(f, delimiter=sep))
    for r in filas:
        for c in COLUMNAS:
            r.setdefault(c, "")
            r[c] = (r[c] or "").strip()
    return [r for r in filas if r["nombre"]]


def guardar(path: str, filas: list[dict]):
    tmp = path + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNAS, delimiter=";", extrasaction="ignore")
        w.writeheader()
        w.writerows(filas)
    os.replace(tmp, path)   # nunca deja el CSV a medio escribir


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower().replace("&", "y")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40].strip("-")
    return s if len(s) >= 3 else (s + "-py")


# ---------------------------------------------------------------- etapa 0
def plantilla(path: str):
    if os.path.exists(path):
        sys.exit(f"{path} ya existe: no lo piso.")
    guardar(path, [{"nombre": "Ejemplo Muebles (borrá esta fila)", "web": "ejemplo.com.py", "instagram": "ejemplo",
                    "telefono": "0981 000-000", "ciudad": "Asunción", "rubro": "Muebles"}])
    print(f"Creado {path}. Abrilo en Excel, completá una fila por comercio y guardalo como CSV.")


# ---------------------------------------------------------------- etapa 1
def detectar(web: str) -> tuple[str, str, int]:
    """Devuelve (estado_web, plataforma, productos_estimados) sin usar IA."""
    w = cl.Web(cl.origen(web))
    home = w.get(w.base + "/")
    if home is None:
        return "no responde", "", 0
    t = w.get(f"{w.base}/products.json?limit=250", json_ok=True)
    if t:
        try:
            prods = json.loads(t).get("products")
            if prods is not None:
                return "ok", "shopify", len(prods)
        except (json.JSONDecodeError, AttributeError):
            pass
    t = w.get(f"{w.base}/wp-json/wc/store/v1/products?per_page=100", json_ok=True)
    if t:
        try:
            prods = json.loads(t)
            if isinstance(prods, list):
                return "ok", "woocommerce", len(prods)
        except json.JSONDecodeError:
            pass
    urls = cl.urls_de_sitemap(w, 100)
    if urls:
        return "ok", "sitemap (usa IA)", len(urls)
    return "ok", "sin catálogo", 0


def revisar(path: str, minimo: int):
    filas = leer(path)
    pend = [r for r in filas if r["web"] and not r["estado_web"]]
    print(f"{len(pend)} tiendas por revisar (de {len(filas)})")
    for n, r in enumerate(pend, 1):
        print(f"[{n}/{len(pend)}] {r['nombre']} · {r['web']}")
        try:
            r["estado_web"], r["plataforma"], cant = detectar(r["web"])
            r["productos_estimados"] = str(cant)
            r["apta"] = "si" if r["estado_web"] == "ok" and cant >= minimo else "no"
        except Exception as e:  # una web rota no frena al resto
            r["estado_web"], r["apta"], r["error"] = "error", "no", str(e)[:200]
        print(f"   {r['estado_web']} · {r['plataforma']} · {r['productos_estimados']} · apta: {r['apta']}")
        guardar(path, filas)
    for r in filas:
        if not r["web"] and not r["apta"]:
            r["apta"] = "sin web"
    guardar(path, filas)
    resumen(filas)


# ---------------------------------------------------------------- etapa 2
def invitar(path: str):
    filas = leer(path)
    m = cl.Michimi()
    existentes = {i["slug"]: i["code"] for i in m.req("GET", "store_invites?select=code,slug") or []}
    pend = [r for r in filas if r["apta"] == "si" and not r["codigo"]]
    print(f"{len(pend)} invitaciones por crear")
    for r in pend:
        if r["slug"] and r["slug"] in existentes:      # quedó a medias en una corrida anterior
            r["codigo"] = existentes[r["slug"]]
            slug = r["slug"]
        else:
            base = slugify(r["nombre"])
            slug, k = base, 2
            while slug in existentes:
                slug = f"{base[:37]}-{k}"
                k += 1
            fila = {"name": r["nombre"][:80], "slug": slug, "website": r["web"] or None,
                    "instagram": r["instagram"].lstrip("@") or None, "phone": r["telefono"] or None,
                    "city": r["ciudad"] or None, "note": (r["rubro"] or "") + " · pipeline"}
            res = m.req("POST", "store_invites", fila, {"Prefer": "return=representation"})
            r["codigo"] = res[0]["code"]
            existentes[slug] = r["codigo"]
        r["slug"] = slug
        print(f"   {r['nombre']} → /reclamar/{r['codigo']}")
        guardar(path, filas)
    resumen(filas)


# ---------------------------------------------------------------- etapa 3
def catalogar(path: str, modelo: str, maximo: int, lote: int):
    filas = leer(path)
    m = cl.Michimi()
    pend = [r for r in filas if r["codigo"] and r["web"] and not r["catalogado_el"]][:lote]
    quedan = sum(1 for r in filas if r["codigo"] and r["web"] and not r["catalogado_el"])
    print(f"Lote de {len(pend)} tiendas (quedan {quedan} en total)")
    for n, r in enumerate(pend, 1):
        print(f"\n[{n}/{len(pend)}] === {r['nombre']} ===")
        inicio = time.time()
        try:
            prods = cl.armar(r["web"], modelo, maximo)
            if prods:
                m.cargar(r["codigo"], prods)
            r["productos_cargados"] = str(len(prods))
            r["con_precio"] = str(sum(1 for p in prods if p["price_amount"]))
            r["error"] = ""
        except SystemExit as e:      # errores de Supabase: frenan todo (clave, permisos)
            guardar(path, filas)
            raise e
        except Exception as e:
            r["error"] = str(e)[:200]
            print(f"   error: {e}")
        r["catalogado_el"] = time.strftime("%Y-%m-%d %H:%M")
        guardar(path, filas)
        print(f"   {r['productos_cargados'] or 0} productos en {int(time.time() - inicio)} s")
    if quedan > len(pend):
        print(f"\nQuedan {quedan - len(pend)}. Volvé a correr: python pipeline_tiendas.py catalogar --lote {lote}")
    resumen(filas)


# ---------------------------------------------------------------- etapa 4
def reporte(path: str):
    filas = leer(path)
    out = "reporte.csv"
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["nombre", "ciudad", "rubro", "productos", "con_precio", "link_reclamo", "vista_previa",
                    "instagram", "telefono", "web", "nota"])
        for r in sorted(filas, key=lambda x: -int(x["productos_cargados"] or 0)):
            if not r["codigo"]:
                continue
            n = int(r["productos_cargados"] or 0)
            nota = "Tienda armada: mandar vista previa" if n >= 10 else ("Pocos productos: ofrecer carga" if n else "Sin productos: ofrecer carga")
            w.writerow([r["nombre"], r["ciudad"], r["rubro"], n, r["con_precio"] or 0,
                        f"https://www.michimi.com/reclamar/{r['codigo']}",
                        f"https://www.michimi.com/reclamar/{r['codigo']}/vista" if n else "",
                        r["instagram"], r["telefono"], r["web"], nota])
    print(f"Listo: {out}")
    resumen(filas)


def resumen(filas: list[dict]):
    tot = len(filas)
    rev = sum(1 for r in filas if r["estado_web"])
    apt = sum(1 for r in filas if r["apta"] == "si")
    inv = sum(1 for r in filas if r["codigo"])
    cat = sum(1 for r in filas if r["catalogado_el"])
    prods = sum(int(r["productos_cargados"] or 0) for r in filas)
    print(f"\nResumen: {tot} tiendas · {rev} revisadas · {apt} aptas · {inv} invitadas · {cat} catalogadas · {prods} productos")


def main():
    ap = argparse.ArgumentParser(description="Pipeline de comercios de Michimi")
    ap.add_argument("etapa", choices=["plantilla", "revisar", "invitar", "catalogar", "reporte"])
    ap.add_argument("--csv", default="tiendas.csv")
    ap.add_argument("--modelo", default="qwen2.5:7b")
    ap.add_argument("--max", type=int, default=300)
    ap.add_argument("--lote", type=int, default=20)
    ap.add_argument("--minimo", type=int, default=5)
    a = ap.parse_args()
    if a.etapa == "plantilla":
        plantilla(a.csv)
    elif a.etapa == "revisar":
        revisar(a.csv, a.minimo)
    elif a.etapa == "invitar":
        invitar(a.csv)
    elif a.etapa == "catalogar":
        catalogar(a.csv, a.modelo, a.max, a.lote)
    else:
        reporte(a.csv)


if __name__ == "__main__":
    main()
