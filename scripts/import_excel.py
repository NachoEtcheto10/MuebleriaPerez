"""
Convierte la planilla de artículos de Pérez (articulos.xlsx) en el catálogo de la tienda.

Uso:
    python scripts/import_excel.py ruta/articulos.xlsx

Genera:
    src/data/seed.json   -> catálogo para el modo demo (sin Supabase)
    supabase/seed.sql    -> carga inicial de productos para Supabase
"""
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------- utilidades


def slug(text: str) -> str:
    text = unicodedata.normalize("NFD", str(text)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


SMALL = {"de", "del", "la", "las", "el", "los", "y", "c/", "con", "x", "para", "en"}
KEEP_UPPER = {"G3", "G4", "LI", "II", "III"}
ACCENTS = {
    "habitacion": "habitación", "clasica": "clásica", "clasico": "clásico", "jackard": "jacquard",
    "sueno": "sueño", "ambar": "ámbar", "sensacion": "sensación", "estambul": "estambul",
    "baul": "baúl", "piston": "pistón", "divan": "diván", "cajon": "cajón", "cajones": "cajones",
    "colchon": "colchón", "sofa": "sofá", "parana": "paraná", "living": "living",
    "modulo": "módulo", "mts": "m", "mt": "m", "bahiut": "bahiut", "maciza": "maciza",
}
BRANDS = [
    "kappesberg", "kappesbarg", "living color", "dimadera", "litoral", "deseo", "quality", "trimar",
    "orlandi", "juarez", "mariani", "gacela", "pino parana", "piero", "suavestar", "simmons",
]
BRAND_LABEL = {"kappesbarg": "Kappesberg", "pino parana": "Pino Paraná", "living color": "Living Color"}


def nice_word(w: str, i: int) -> str:
    low = w.lower()
    if w.upper() in KEEP_UPPER:
        return w.upper()
    if re.search(r"\d", w):
        return w.lower().replace("mts", "m")
    low = ACCENTS.get(low, low)
    if i > 0 and low in SMALL:
        return low
    return low[:1].upper() + low[1:]


def nice_name(raw: str) -> str:
    raw = re.sub(r"\s+", " ", str(raw).strip())
    words = raw.split(" ")
    return " ".join(nice_word(w, i) for i, w in enumerate(words))


def find_brand(name: str):
    low = name.lower()
    for b in BRANDS:
        if b in low:
            return BRAND_LABEL.get(b, b.title())
    return None


def split_colors(value):
    if not value:
        return []
    return [w.capitalize() for w in str(value).split()]


MEASURE_RE = re.compile(r"(\d{2,3})\s*[xX]\s*(\d{2,3})")


def size_from_width(width: int):
    if width <= 70:
        return "Cuna"
    if width <= 90:
        return "1 plaza"
    if width <= 110:
        return "1 plaza y media"
    if width <= 150:
        return "2 plazas"
    if width <= 170:
        return "Queen"
    if width <= 190:
        return "King"
    return "Super King"


SIZE_LABEL = {
    "1 PLAZA": "1 plaza", "1 PLAZA Y MEDIA": "1 plaza y media", "2 PLAZAS": "2 plazas",
    "QUEEN": "Queen", "KING": "King", "SUPERKING": "Super King", "CUNA": "Cuna",
}

# Categorías de la planilla -> taxonomía de la tienda (slugs)
MUEBLES_MAP = {
    ("HABITACION", "PLACARES"): ("habitacion", "placares"),
    ("HABITACION", "MESAS DE LUZ"): ("habitacion", "mesas-de-luz"),
    ("HABITACION", "CUNAS"): ("habitacion", "cunas"),
    ("HABITACION", "CAMAS"): ("habitacion", "camas"),
    ("HABITACION", "CAJONERAS"): ("habitacion", "cajoneras"),
    ("HABITACION", "BOTINEROS"): ("habitacion", "botineros"),
    ("HABITACION", "RESPALDOS DE SOMMIER"): ("habitacion", "respaldos-de-sommier"),
    ("COCINA", "ALACENAS"): ("cocina", "alacenas"),
    ("COCINA", "BAJOMESADAS"): ("cocina", "bajomesadas"),
    ("COCINA", "BOTELLEROS"): ("cocina", "botelleros"),
    ("COCINA", "DESPENSEROS"): ("cocina", "despenseros"),
    ("COCINA", "MESADAS"): ("cocina", "mesadas"),
    ("LIVING COMEDOR", "BAHIUTS"): ("living-comedor", "bahiuts"),
    ("LIVING COMEDOR", "COMBOS"): ("living-comedor", "combos"),
    ("LIVING COMEDOR", "MESAS"): ("living-comedor", "mesas"),
    ("LIVING COMEDOR", "SILLAS"): ("living-comedor", "sillas"),
    ("LIVING COMEDOR", "RACKS"): ("living-comedor", "racks"),
    ("LIVING COMEDOR", "RATONA"): ("living-comedor", "mesas-ratonas"),
    ("LIVING COMEDOR", "MODULARES"): ("living-comedor", "modulares"),
    ("LIVING COMEDOR", "OTROS"): ("living-comedor", "otros"),
    ("OFICINA", "BIBLIOTECAS"): ("oficina", "bibliotecas"),
    ("OFICINA", "ESCRITORIOS"): ("oficina", "escritorios"),
    ("OFICINA", "SILLAS OFICINA"): ("oficina", "sillas-de-oficina"),
    ("PATIO", "SILLONES"): ("patio", "sillones"),
    ("PATIO", "SILLAS"): ("patio", "sillas"),
    ("PATIO", "REPOSERAS"): ("patio", "reposeras"),
    ("PATIO", "MESAS"): ("patio", "mesas"),
    ("PATIO", "COMBOS"): ("patio", "combos"),
}
LIVING_MAP = {"kappesberg": "kappesberg", "living color": "living-color", "otro": "otros"}


def model_key(name: str) -> str:
    """Clave para agrupar el mismo colchón en distintas medidas."""
    low = name.lower()
    low = MEASURE_RE.sub(" ", low)
    low = re.sub(r"\b(conjunto|colch[oó]n|\d+\s*cm|\d+cm)\b", " ", low)
    return slug(low)


# ---------------------------------------------------------------- lectura


def read(path: Path):
    wb = openpyxl.load_workbook(path, data_only=True)
    products = []

    for r in wb["MUEBLES"].iter_rows(min_row=3, values_only=True):
        if not any(r) or not r[0]:
            continue
        cat, sub = MUEBLES_MAP[(str(r[0]).strip(), str(r[1]).strip())]
        name = nice_name(r[3])
        products.append({
            "code": str(r[2]).strip(), "name": name, "category": cat, "subcategory": sub,
            "brand": find_brand(name), "colors": split_colors(r[5]),
            "price_list": float(r[4]) if r[4] else None,
        })

    for r in wb["LIVING"].iter_rows(min_row=3, values_only=True):
        if not any(r) or not r[0]:
            continue
        name = nice_name(r[2])
        products.append({
            "code": str(r[1]).strip(), "name": name, "category": "sofas",
            "subcategory": LIVING_MAP[str(r[0]).strip().lower()], "brand": find_brand(name),
            "colors": [], "price_list": float(r[3]) if r[3] else None,
        })

    for r in wb["COLCHONES"].iter_rows(min_row=4, values_only=True):
        if not any(r) or not r[0]:
            continue
        group = str(r[0]).strip().upper()
        kind = (r[3] or "").strip().upper()  # COLCHON / CONJUNTO
        material = (r[4] or "").strip().upper()  # RESORTES / ESPUMA
        raw = str(r[2]).strip()
        name = nice_name(raw)
        m = MEASURE_RE.search(raw)
        size = SIZE_LABEL.get(group)
        if group == "SOMMIERS":
            sub = "sommiers"
            size = size_from_width(int(m.group(1))) if m else None
        elif group == "ALMOHADAS":
            sub, size = "almohadas", None
        elif kind == "CONJUNTO":
            sub = "conjuntos"
        elif material == "RESORTES":
            sub = "resortes"
        else:
            sub = "espuma"
        if sub in ("resortes", "espuma") and not name.lower().startswith("colch"):
            name = "Colchón " + name
        products.append({
            "code": str(r[1]).strip(), "name": name, "category": "colchones", "subcategory": sub,
            "brand": find_brand(name), "colors": [],
            "size": size, "measure": f"{m.group(1)}x{m.group(2)}" if m else None,
            "material": material.lower() or None,
            "kind": "conjunto" if kind == "CONJUNTO" else ("colchon" if sub in ("resortes", "espuma") else None),
            "model": model_key(raw) if sub in ("resortes", "espuma", "conjuntos", "sommiers") else None,
            "price_list": float(r[5]) if r[5] else None,
        })

    # ids únicos a partir del nombre: forman la dirección del producto (/producto/<id>)
    # y no muestran el código interno al cliente
    seen = Counter()
    for i, p in enumerate(products):
        base = slug(p["name"]) or f"art-{i}"
        seen[base] += 1
        p["id"] = base if seen[base] == 1 else f"{base}-{seen[base]}"
        p.setdefault("size", None)
        p.setdefault("measure", None)
        p.setdefault("material", None)
        p.setdefault("kind", None)
        p.setdefault("model", None)
        p.update({"description": "", "discount_pct": 0, "available": True, "featured": False,
                  "images": [], "sort": i})
    return products


def sql_value(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, list):
        return "array[" + ",".join(sql_value(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"


COLUMNS = ["id", "code", "name", "description", "category", "subcategory", "brand", "size", "measure",
           "material", "kind", "model", "colors", "price_list", "discount_pct", "available", "featured",
           "images", "sort"]


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "_src" / "articulos.xlsx"
    products = read(src)

    (ROOT / "src" / "data").mkdir(parents=True, exist_ok=True)
    (ROOT / "src" / "data" / "seed.json").write_text(
        json.dumps(products, ensure_ascii=False, indent=1), encoding="utf-8")

    (ROOT / "supabase").mkdir(exist_ok=True)
    lines = ["-- Carga inicial generada por scripts/import_excel.py", "insert into public.products (" +
             ", ".join(COLUMNS) + ") values"]
    rows = [" (" + ", ".join(sql_value(p[c]) for c in COLUMNS) + ")" for p in products]
    lines.append(",\n".join(rows))
    # Al reimportar: actualiza datos de la planilla, pero conserva lo cargado desde el admin
    # (fotos, descripción, estado, ofertas) y no borra un precio si la planilla viene vacía.
    keep = ("id", "images", "description", "available", "featured", "discount_pct", "price_list")
    updates = [f"{c} = excluded.{c}" for c in COLUMNS if c not in keep]
    updates.append("price_list = coalesce(excluded.price_list, public.products.price_list)")
    updates.append("updated_at = now()")
    lines.append("on conflict (id) do update set " + ", ".join(updates) + ";")
    (ROOT / "supabase" / "seed.sql").write_text("\n".join(lines) + "\n", encoding="utf-8")

    by_cat = Counter(p["category"] for p in products)
    print(f"{len(products)} productos ->", dict(by_cat))
    print("sin precio:", sum(1 for p in products if p["price_list"] is None))


if __name__ == "__main__":
    main()
