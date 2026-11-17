#!/usr/bin/env python3
"""
Extractor de datos: convierte el PDF "BUILD HAMBURGUESAS COLOMBIA" en data/burgers.js.

Uso:
    pdftotext -layout BUILD-HAMBURGUESAS-COLOMBIA.pdf build.txt
    python3 tools/extract.py build.txt > data/burgers.js

Reglas:
  * Cada página (separada por \\f) es UNA hamburguesa. La página 1 es la portada.
  * Las primeras líneas de la página forman el título; el resto son las capas,
    en el mismo orden en que aparecen en el documento.
  * Cada línea de capa se asigna a un ingrediente normalizado + cantidad
    mediante las reglas de RULES. Si una línea no encaja en ninguna regla,
    el script FALLA (no se inventa ni se descarta nada).
  * El texto original de cada capa se conserva en el campo `src`.
"""
import json
import re
import sys

# (regex sobre la línea en minúsculas, id de ingrediente, función de cantidad)
def num_und(line):
    m = re.search(r'(\d+)\s*und', line)
    if m:
        return f"{m.group(1)} und"
    if re.search(r'\bdos\b', line):
        return "2 und"
    raise ValueError(f"Cantidad no encontrada: {line}")

def fetas(line):
    m = re.search(r'(\d+)\s*(feta|tajada)', line)
    if not m:
        raise ValueError(f"Cantidad de queso no encontrada: {line}")
    n = int(m.group(1))
    return "1 feta" if n == 1 else f"{n} fetas"

def ketchup(line):
    if '1/3' in line:
        return "1/3 oz"
    if '½' in line or '1/2' in line:
        return "½ oz"
    raise ValueError(line)

def half(line):
    if '½' in line or '1/2' in line:
        return "½ oz"
    raise ValueError(line)

def third(line):
    if '1/3' in line:
        return "1/3 oz"
    raise ValueError(line)

def lechuga(line):
    if '14g' in line.replace(' ', ''):
        return "14 g"
    if '28g' in line.replace(' ', ''):
        return "28 g"
    raise ValueError(line)

def fixed(v):
    def f(line):
        return v
    return f

def none(line):
    return None

RULES = [
    (r'^big mac base$', 'bigmac_base', none),
    (r'^big mac club$', 'bigmac_club', none),
    (r'^big mac corona$', 'bigmac_corona', none),
    (r'salsa big mac', 'salsa_bigmac', third),
    (r'^base pan regular$', 'base_regular', none),
    (r'^corona pan regular$', 'corona_regular', none),
    (r'^base pan cuarto$', 'base_cuarto', none),
    (r'^corona pan cuarto$', 'corona_cuarto', none),
    (r'^base pan de papa$', 'base_papa', none),
    (r'^corona pan de papa$', 'corona_papa', none),
    (r'^base english muffin$', 'base_muffin', none),
    (r'^corona english muffin$', 'corona_muffin', none),
    (r'^(base pan brioche|brioche heel|briche heel)$', 'base_brioche', none),
    (r'^corona pan brioche$', 'corona_brioche', none),
    (r'^carne 10:1$', 'carne_10_1', none),
    (r'^carne 4:1$', 'carne_4_1', none),
    (r'queso cheddar', 'queso_cheddar', fetas),
    (r'pepinillos', 'pepinillos', num_und),
    (r'cebolla rehidratada 3,5', 'cebolla_rehidratada', fixed("3,5 g")),
    (r'cebolla fresca.*7g', 'cebolla_fresca', fixed("7 g")),
    (r'cebolla grillada.*7g', 'cebolla_grillada', fixed("7 g")),
    (r'cebolla crispy 7g', 'cebolla_crispy', fixed("7 g")),
    (r'k[ée]tchup', 'ketchup', ketchup),
    (r'mostaza[ -]*1/35 a 1/65', 'mostaza', fixed("1/35 a 1/65 oz")),
    (r'mayonesa.*2/3', 'mayonesa', fixed("2/3 oz")),
    (r'spicy pepper', 'spicy_pepper', half),
    (r'espiral bbq', 'espiral_bbq', half),
    (r'(sasla|salsa) tasty', 'salsa_tasty', half),
    (r'lechuga', 'lechuga', lechuga),
    (r'^tomate', 'tomate', num_und),
    (r'bacon picado', 'bacon_picado', half),
    (r'(bacon|tocineta|tocienta)', 'bacon_tiras', num_und),
    (r'huevo pochado', 'huevo_pochado', num_und),
    (r'^salchicha', 'salchicha', num_und),
    (r'pattie de pollo', 'pattie_pollo', num_und),
    (r'filete (pollo )?apanad', 'filete_apanado', num_und),
]

FIRST_LAYER = re.compile(r'^(base |big mac base|brioche heel|briche heel)', re.I)


def clean(s):
    return re.sub(r'\s+', ' ', s).strip()


def classify(line):
    low = clean(line).lower()
    hits = [(ing, q) for rx, ing, q in RULES if re.search(rx, low)]
    if not hits:
        raise SystemExit(f"ERROR: línea sin regla: {line!r}")
    ing, q = hits[0]
    return ing, q(low)


def main(path):
    pages = open(path, encoding='utf-8').read().split('\f')
    burgers = []
    for pn, page in enumerate(pages, 1):
        lines = [clean(l) for l in page.splitlines() if l.strip()]
        if not lines or pn == 1:
            continue
        idx = next(i for i, l in enumerate(lines) if FIRST_LAYER.match(l))
        title = ' '.join(lines[:idx])
        steps = []
        for l in lines[idx:]:
            ing, qty = classify(l)
            steps.append([ing, qty, l])
        burgers.append({'page': pn, 'docTitle': title, 'steps': steps})
    json.dump(burgers, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1])
