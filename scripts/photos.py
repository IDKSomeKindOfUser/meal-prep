"""Photos for recipes from Wikimedia Commons.

  python scripts/photos.py search OUT_DIR   -- find candidates, save sheets OUT_DIR/sheet-N.jpg to pick from
  python scripts/photos.py build OUT_DIR    -- turn scripts/photo-choice.json into public/photos/*.webp
                                               and src/data/photos.json

photo-choice.json maps a recipe id to the number of a candidate on the sheet (1-based), or to a
"File:..." title when the photo was found by hand.
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

ROOT = Path(__file__).resolve().parent.parent
QUERIES = ROOT / 'scripts' / 'photo-queries.json'
FOUND = ROOT / 'scripts' / 'photo-candidates.json'
CHOICE = ROOT / 'scripts' / 'photo-choice.json'
PHOTOS = ROOT / 'public' / 'photos'
CREDITS = ROOT / 'src' / 'data' / 'photos.json'
API = 'https://commons.wikimedia.org/w/api.php'
AGENT = 'MealPrepPhotoScript/1.0 (personal recipe site; python urllib)'
PER_RECIPE = 6
SIDE = 500
LIMIT = 80 * 1024
FREE = re.compile(r'^(cc0|cc[ -]by(-sa)?[ -][\d.]+.*|public domain|pd.*)$', re.I)


def get(url: str) -> bytes:
    for attempt in range(5):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': AGENT})
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 4:
                raise
            time.sleep(5 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError):
            if attempt == 4:
                raise
            time.sleep(5 * (attempt + 1))
    raise RuntimeError('unreachable')


def api(**params: str) -> dict:
    params = {'action': 'query', 'format': 'json', **params}
    return json.loads(get(API + '?' + urllib.parse.urlencode(params)))


def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', value))).strip()


def describe(page: dict) -> dict | None:
    info = page['imageinfo'][0]
    meta = info.get('extmetadata', {})
    license_name = plain(meta.get('LicenseShortName', {}).get('value', ''))
    if not FREE.match(license_name) or min(info['width'], info['height']) < SIDE:
        return None
    return {
        'title': page['title'],
        'author': plain(meta.get('Artist', {}).get('value', '')) or 'unknown',
        'license': license_name,
        'licenseUrl': meta.get('LicenseUrl', {}).get('value', ''),
        'source': info['descriptionurl'],
        'thumb': info['thumburl'],
    }


IMAGEINFO = {'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': '800'}


def search(query: str) -> list[dict]:
    data = api(generator='search', gsrnamespace='6', gsrlimit='12',
               gsrsearch=f'{query} filetype:bitmap', **IMAGEINFO)
    pages = sorted(data.get('query', {}).get('pages', {}).values(), key=lambda p: p['index'])
    return [found for page in pages if (found := describe(page))]


def by_title(title: str) -> dict:
    page = next(iter(api(titles=title, **IMAGEINFO)['query']['pages'].values()))
    found = describe(page)
    if not found:
        raise SystemExit(f'{title}: license is not free or the image is too small')
    return found


def candidates(queries: list[str]) -> list[dict]:
    seen, picked = set(), []
    for query in queries:
        for found in search(query):
            if found['title'] not in seen:
                seen.add(found['title'])
                picked.append(found)
        time.sleep(0.5)
    return picked[:PER_RECIPE]


def square(data: bytes, side: int) -> Image.Image:
    image = Image.open(io.BytesIO(data)).convert('RGB')
    edge = min(image.size)
    left, top = (image.width - edge) // 2, (image.height - edge) // 2
    return image.crop((left, top, left + edge, top + edge)).resize((side, side), Image.LANCZOS)


def run_search(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    queries: dict[str, list[str]] = json.loads(QUERIES.read_text(encoding='utf-8'))
    found_file = FOUND
    found = json.loads(found_file.read_text(encoding='utf-8')) if found_file.exists() else {}
    for recipe, words in queries.items():
        if recipe not in found:
            found[recipe] = candidates(words)
            found_file.write_text(json.dumps(found, ensure_ascii=False, indent=1), encoding='utf-8')
            print(recipe, len(found[recipe]), flush=True)

    def thumb(item: dict) -> Image.Image:
        try:
            return square(get(item['thumb']), 150)
        except Exception as error:  # noqa: BLE001 - a broken thumbnail only leaves a grey tile
            print('thumb failed', item['title'], error)
            return Image.new('RGB', (150, 150), 'grey')

    font = ImageFont.load_default(16)
    done = json.loads(CREDITS.read_text(encoding='utf-8')) if CREDITS.exists() else {}
    ids = [recipe for recipe in queries if recipe not in done]
    for sheet_no, start in enumerate(range(0, len(ids), 12), 1):
        chunk = ids[start:start + 12]
        sheet = Image.new('RGB', (170 + PER_RECIPE * 160, 160 * len(chunk)), 'white')
        draw = ImageDraw.Draw(sheet)
        for row, recipe in enumerate(chunk):
            y = row * 160
            draw.text((6, y + 60), recipe, fill='black', font=font)
            with ThreadPoolExecutor(4) as pool:
                tiles = list(pool.map(thumb, found[recipe]))
            for col, tile in enumerate(tiles):
                x = 170 + col * 160
                sheet.paste(tile, (x, y + 5))
                draw.rectangle((x, y + 5, x + 22, y + 25), fill='black')
                draw.text((x + 6, y + 6), str(col + 1), fill='white', font=font)
        sheet.save(out / f'sheet-{sheet_no}.jpg', quality=80)
        print('sheet', sheet_no, flush=True)


def webp(image: Image.Image) -> bytes:
    for quality in range(80, 30, -5):
        buffer = io.BytesIO()
        image.save(buffer, 'WEBP', quality=quality, method=6)
        if buffer.tell() <= LIMIT:
            return buffer.getvalue()
    raise SystemExit('could not fit the photo into 80 KB')


def run_build(out: Path) -> None:
    found = json.loads(FOUND.read_text(encoding='utf-8'))
    choice: dict[str, int | str] = json.loads(CHOICE.read_text(encoding='utf-8'))
    PHOTOS.mkdir(parents=True, exist_ok=True)
    credits = json.loads(CREDITS.read_text(encoding='utf-8')) if CREDITS.exists() else {}
    for recipe, pick in choice.items():
        if recipe in credits and (PHOTOS / f'{recipe}.webp').exists():
            continue
        item = by_title(pick) if isinstance(pick, str) else found[recipe][pick - 1]
        target = PHOTOS / f'{recipe}.webp'
        target.write_bytes(webp(square(get(item['thumb']), SIDE)))
        credits[recipe] = {key: item[key] for key in ('title', 'author', 'license', 'licenseUrl', 'source')}
        print(recipe, target.stat().st_size // 1024, 'KB', flush=True)
    CREDITS.write_text(json.dumps(credits, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    mode, folder = sys.argv[1], Path(sys.argv[2])
    {'search': run_search, 'build': run_build}[mode](folder)
