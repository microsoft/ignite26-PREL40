#!/usr/bin/env python3
# Interim illustration of the HL-1042 kitchen for the storage checkpoint:
#   data/samples/HL-1042-kitchen-current.jpg
#
# Planned to be replaced by an AI-generated photo (image-gen skill), stamped the
# same way. Requires Pillow:
#   pip install pillow && python3 data/generator/kitchen_illustration.py

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import random, sys
random.seed(1042)
W, H = 1600, 1067
img = Image.new('RGB', (W, H), (236, 228, 210))
d = ImageDraw.Draw(img)
def font(size, bold=False):
    for name in (["/System/Library/Fonts/Supplemental/Arial Bold.ttf"] if bold else ["/System/Library/Fonts/Supplemental/Arial.ttf"]) + ["/System/Library/Fonts/Helvetica.ttc"]:
        try: return ImageFont.truetype(name, size)
        except Exception: pass
    return ImageFont.load_default()
# Back wall with dated wallpaper stripes
for x in range(0, W, 40):
    d.rectangle([x, 0, x + 20, 640], fill=(228, 214, 186))
# Window
d.rectangle([980, 90, 1380, 322], fill=(255, 255, 255), outline=(150, 130, 100), width=14)
d.rectangle([994, 104, 1366, 308], fill=(186, 214, 232))
d.line([1180, 104, 1180, 308], fill=(150, 130, 100), width=10)
d.line([994, 206, 1366, 206], fill=(150, 130, 100), width=10)
# Upper cabinets (dated oak)
for i, x in enumerate(range(120, 900, 195)):
    d.rectangle([x, 90, x + 180, 330], fill=(176, 128, 74), outline=(120, 82, 42), width=6)
    d.rectangle([x + 22, 112, x + 158, 308], outline=(140, 96, 52), width=4)
    d.ellipse([x + 140, 200, x + 154, 214], fill=(90, 70, 40))
# Backsplash tiles
for y in range(330, 600, 34):
    for x in range(0, W, 34):
        shade = 222 + random.randint(-8, 8)
        d.rectangle([x, y, x + 32, y + 32], fill=(shade, shade - 6, shade - 30))
# Countertop and lower cabinets
d.rectangle([0, 600, W, 640], fill=(122, 110, 92))
for x in range(60, W, 210):
    d.rectangle([x, 640, x + 195, 940], fill=(170, 122, 70), outline=(118, 80, 40), width=6)
    d.rectangle([x + 20, 668, x + 175, 915], outline=(140, 96, 52), width=4)
    d.rectangle([x + 80, 690, x + 115, 702], fill=(90, 70, 40))
# Old stove
d.rectangle([700, 560, 980, 940], fill=(232, 232, 226), outline=(150, 150, 140), width=6)
for cx in (760, 900):
    for cy in (585,):
        d.ellipse([cx - 40, cy - 14, cx + 40, cy + 14], outline=(60, 60, 60), width=6)
d.rectangle([730, 660, 950, 900], fill=(210, 210, 204), outline=(120, 120, 112), width=5)
d.rectangle([760, 690, 920, 780], fill=(70, 70, 70))
# Sink and tap under window
d.rectangle([1060, 590, 1300, 612], fill=(196, 200, 204))
d.line([1180, 520, 1180, 590], fill=(160, 164, 168), width=12)
d.line([1180, 522, 1230, 522], fill=(160, 164, 168), width=12)
# Floor (worn vinyl)
for y in range(940, H, 64):
    for x in range(0, W, 64):
        c = 196 if (x // 64 + y // 64) % 2 else 172
        d.rectangle([x, y, x + 64, y + 64], fill=(c, c - 10, c - 30))
# Caption bar
d.rectangle([0, H - 92, W, H], fill=(30, 30, 30))
d.text((40, H - 76), "HL-1042 · Current kitchen, before renovation", font=font(34, True), fill=(255, 255, 255))
d.text((40, H - 34), "Synthetic illustration for the Microsoft Ignite PREL40 lab. Fictional property.", font=font(22), fill=(210, 210, 210))
# Stamp
stamp = Image.new('RGBA', (1060, 220), (0, 0, 0, 0))
sd = ImageDraw.Draw(stamp)
sd.rounded_rectangle([6, 6, 1054, 214], radius=18, outline=(200, 40, 40, 235), width=10)
sd.text((48, 28), "SYNTHETIC SAMPLE", font=font(92, True), fill=(200, 40, 40, 235))
sd.text((52, 142), "Caldova Home Loans lab", font=font(48, True), fill=(200, 40, 40, 235))
stamp = stamp.rotate(14, expand=True, resample=Image.BICUBIC)
img.paste(stamp, (260, 230), stamp)
out = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).resolve().parents[1] / "samples" / "HL-1042-kitchen-current.jpg")
img.save(out, 'JPEG', quality=86, optimize=True, progressive=True)
print(out)
