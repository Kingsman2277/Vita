#!/usr/bin/env python3
"""Generate the PWA icon set.

The mark is the handoff's §7 suggestion: an orange "V" on near-black. It is
drawn geometrically rather than set in a typeface so the output does not
depend on which fonts the machine happens to have.

Run with: python3 -I scripts/make-icons.py
"""
from PIL import Image, ImageDraw

BG = (11, 11, 12)          # --bg  #0B0B0C
ACCENT = (255, 90, 31)     # --accent #FF5A1F
SS = 4                     # supersample factor, for clean diagonals


def draw_v(size, mark_ratio, bg, fg, radius_ratio=None):
    """Square icon with a centred V occupying `mark_ratio` of the canvas."""
    s = size * SS
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if radius_ratio:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_ratio), fill=bg)
    else:
        d.rectangle([0, 0, s - 1, s - 1], fill=bg)

    span = s * mark_ratio
    left = (s - span) / 2
    right = left + span
    top = (s - span * 0.86) / 2
    bottom = top + span * 0.86
    stroke = max(2, int(span * 0.18))

    d.line(
        [(left + stroke / 2, top), ((left + right) / 2, bottom - stroke / 2), (right - stroke / 2, top)],
        fill=fg, width=stroke, joint='curve',
    )
    # Round the two open ends so the stroke reads as one continuous mark.
    r = stroke / 2
    for x in (left + stroke / 2, right - stroke / 2):
        d.ellipse([x - r, top - r, x + r, top + r], fill=fg)

    return img.resize((size, size), Image.LANCZOS)


def save(img, path):
    Image.new('RGB', img.size, BG).paste(img, (0, 0), img) if False else None
    flat = Image.new('RGB', img.size, BG)
    flat.paste(img, (0, 0), img)
    flat.save(path, 'PNG', optimize=True)
    print(f'  {path}  {img.size[0]}x{img.size[1]}')


print('writing icons:')
# Standard icons: full-bleed dark field, large mark.
save(draw_v(192, 0.56, BG, ACCENT), 'public/icons/icon-192.png')
save(draw_v(512, 0.56, BG, ACCENT), 'public/icons/icon-512.png')
# Maskable: launchers crop to a circle, so the mark stays inside the
# inner 80% safe zone and the field runs edge to edge.
save(draw_v(512, 0.40, BG, ACCENT), 'public/icons/icon-maskable-512.png')
# Apple adds its own rounding and does not composite transparency.
save(draw_v(180, 0.56, BG, ACCENT), 'public/apple-touch-icon.png')
