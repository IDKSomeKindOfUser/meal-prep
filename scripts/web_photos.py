"""Photos for recipes from Bing image search (recipe sites, stock photos).

  python scripts/web_photos.py search OUT_DIR  -- find candidates, save sheets OUT_DIR/web-N.jpg to pick from
  python scripts/web_photos.py build           -- turn scripts/web-choice.json into public/photos/*.webp
                                                  and src/data/photos.json

On a sheet tile 0 is the current photo. web-choice.json maps a recipe id to the number of a
candidate (1-based); 0 or a missing id keeps the current photo.
"""
from __future__ import annotations

import html
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from photos import CREDITS, PHOTOS, ROOT, SIDE, square, webp

FOUND = ROOT / 'scripts' / 'web-candidates.json'
CHOICE = ROOT / 'scripts' / 'web-choice.json'
RECIPES = ROOT / 'src' / 'data' / 'recipes.json'
AGENT = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
         '(KHTML, like Gecko) Chrome/130.0 Safari/537.36')
PER_RECIPE = 7
TILE = 180
ROWS = 10


def get(url: str, referer: str = '') -> bytes:
    headers = {'User-Agent': AGENT, 'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8'}
    if referer:
        headers['Referer'] = referer
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def query(name: str) -> str:
    name = name.split(' + ')[0]
    name = re.sub(r'\([^)]*\)', '', name)
    name = re.sub(r'\b(в аэрогриле|из аэрогриля|за 20 минут)\b', '', name)
    return re.sub(r'\s+', ' ', name).strip(' ,') + ' рецепт'


def search(text: str) -> list[dict]:
    url = ('https://www.bing.com/images/search?form=HDRSC2&qft=+filterui:imagesize-large&q='
           + urllib.parse.quote(text))
    page = get(url).decode('utf-8', 'replace')
    stems = {word[:5] for word in re.findall(r'[а-яё]{4,}', text.lower()) if word != 'рецепт'}
    found, seen = [], set()
    for raw in re.findall(r'\bm="(\{[^"]*\})"', page):
        try:
            item = json.loads(html.unescape(raw))
        except json.JSONDecodeError:
            continue
        if not item.get('murl') or not item.get('turl') or item['murl'] in seen:
            continue
        where = (item.get('t', '') + ' ' + urllib.parse.unquote(item.get('purl', ''))).lower()
        if not any(stem in where for stem in stems):
            continue  # Bing shows trending images instead of results when it throttles
        seen.add(item['murl'])
        found.append({'image': item['murl'], 'thumb': item['turl'], 'page': item.get('purl', ''),
                      'title': plain(item.get('t', ''))})
        if len(found) == PER_RECIPE:
            break
    return found


def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', value))).strip()


def recipes() -> list[dict]:
    data = json.loads(RECIPES.read_text(encoding='utf-8'))
    return data if isinstance(data, list) else list(data.values())


def run_search(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    found = json.loads(FOUND.read_text(encoding='utf-8')) if FOUND.exists() else {}
    all_recipes = recipes()
    for recipe in all_recipes:
        if len(found.get(recipe['id'], [])) < PER_RECIPE:
            for attempt in range(4):
                found[recipe['id']] = search(query(recipe['name']))
                if len(found[recipe['id']]) == PER_RECIPE:
                    break
                time.sleep(10 * (attempt + 1))
            time.sleep(4)
            FOUND.write_text(json.dumps(found, ensure_ascii=False, indent=1), encoding='utf-8')
            print(recipe['id'], len(found[recipe['id']]), flush=True)

    def tile(url: str) -> Image.Image:
        try:
            return square(get(url), TILE)
        except Exception:  # noqa: BLE001 - a broken thumbnail only leaves a grey tile
            return Image.new('RGB', (TILE, TILE), 'grey')

    def current(recipe_id: str) -> Image.Image:
        path = PHOTOS / f'{recipe_id}.webp'
        if not path.exists():
            return Image.new('RGB', (TILE, TILE), 'grey')
        return Image.open(path).convert('RGB').resize((TILE, TILE))

    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
    step = TILE + 6
    for sheet_no, start in enumerate(range(0, len(all_recipes), ROWS), 1):
        chunk = all_recipes[start:start + ROWS]
        sheet = Image.new('RGB', (200 + (PER_RECIPE + 1) * step, (step + 4) * len(chunk)), 'white')
        draw = ImageDraw.Draw(sheet)
        for row, recipe in enumerate(chunk):
            y = row * (step + 4)
            words, line, lines = recipe['name'].split(), '', []
            for word in words:
                if len(line + ' ' + word) > 22:
                    lines.append(line)
                    line = word
                else:
                    line = (line + ' ' + word).strip()
            lines.append(line)
            draw.text((4, y + 4), recipe['id'], fill='blue', font=font)
            for n, text in enumerate(lines[:8]):
                draw.text((4, y + 24 + n * 18), text, fill='black', font=font)
            with ThreadPoolExecutor(6) as pool:
                tiles = [current(recipe['id'])] + list(pool.map(tile, [c['thumb'] for c in found[recipe['id']]]))
            for col, image in enumerate(tiles):
                x = 200 + col * step
                sheet.paste(image, (x, y))
                draw.rectangle((x, y, x + 22, y + 22), fill='red' if col == 0 else 'black')
                draw.text((x + 6, y + 2), str(col), fill='white', font=font)
        sheet.save(out / f'web-{sheet_no}.jpg', quality=80)
        print('sheet', sheet_no, flush=True)


def fetch(item: dict) -> Image.Image:
    """The original image, or Bing's resized copy when the site refuses or the original is small."""
    try:
        image = Image.open(io.BytesIO(get(item['image'], item['page'])))
        if min(image.size) >= SIDE:
            return image
    except Exception:  # noqa: BLE001 - fall back to Bing's copy below
        pass
    # Bing's sized copies (w=, h=, c=7) come letterboxed with white bars, the plain one does not.
    return Image.open(io.BytesIO(get(item['thumb'])))


def run_build() -> None:
    found = json.loads(FOUND.read_text(encoding='utf-8'))
    choice: dict[str, int] = json.loads(CHOICE.read_text(encoding='utf-8'))
    credits = json.loads(CREDITS.read_text(encoding='utf-8'))
    only = set(sys.argv[2:])
    for recipe, pick in choice.items():
        if not pick or (only and recipe not in only):
            continue
        item = found[recipe][pick - 1]
        image = fetch(item)
        buffer = io.BytesIO()
        image.convert('RGB').save(buffer, 'PNG')
        target = PHOTOS / f'{recipe}.webp'
        target.write_bytes(webp(square(buffer.getvalue(), SIDE)))
        credits[recipe] = {'title': item['title'], 'author': urllib.parse.urlsplit(item['page'] or item['image']).hostname or '',
                           'license': '', 'licenseUrl': '', 'source': item['page'] or item['image']}
        print(recipe, target.stat().st_size // 1024, 'KB', flush=True)
    CREDITS.write_text(json.dumps(credits, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    if sys.argv[1] == 'search':
        run_search(Path(sys.argv[2]))
    else:
        run_build()
