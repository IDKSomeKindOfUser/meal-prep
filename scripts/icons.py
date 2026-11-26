"""Draws the app icons (public/icon-*.png) from the Prepka mark in public/icon.svg.

Run: python scripts/icons.py. Repeat after the mark changes.
"""
from PIL import Image, ImageDraw

GROUND = '#f5f5ef'
ACCENT = '#8c1d52'
DOT = '#f2c94c'
SCALE = 4  # Draw large, then shrink for smooth edges.


def icon(size: int, mark_share: float) -> Image.Image:
    big = size * SCALE
    image = Image.new('RGB', (big, big), GROUND)
    draw = ImageDraw.Draw(image)
    unit = big * mark_share / 32  # The mark is drawn on a 32 by 32 grid.
    offset = (big - 32 * unit) / 2

    def box(x0: float, y0: float, x1: float, y1: float) -> tuple[float, float, float, float]:
        return (offset + x0 * unit, offset + y0 * unit, offset + x1 * unit, offset + y1 * unit)

    draw.rounded_rectangle(box(6, 4, 12, 29), radius=3 * unit, fill=ACCENT)
    draw.ellipse(box(7.5, 3.5, 26.5, 22.5), fill=ACCENT)
    draw.ellipse(box(12, 8, 22, 18), fill=GROUND)
    draw.ellipse(box(14.6, 10.6, 19.4, 15.4), fill=DOT)
    return image.resize((size, size), Image.LANCZOS)


# The mark fills 60% so it stays inside the safe circle of maskable icons.
for size in (192, 512):
    icon(size, 0.6).save(f'public/icon-{size}.png', optimize=True)
icon(180, 0.7).save('public/apple-touch-icon.png', optimize=True)
