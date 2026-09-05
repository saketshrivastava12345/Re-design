"""
Derive the still imagery used by the page sections from the supplied journey
frames. Every image on the site therefore comes from the original GML footage
rather than from stock photography.

Usage:  python tools/build_stills.py
"""
import os
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "assets", "frames", "desktop")
OUT  = os.path.join(ROOT, "assets", "img")

# name, source frame, (crop box on the 1408x792 source or None), output width,
# brightness multiplier, saturation multiplier
STILLS = [
    ("road",        38,  None,                       1280, 1.00, 1.00),
    ("terminal",    92,  None,                       1280, 1.00, 1.00),
    ("ocean-cargo", 120, None,                       1280, 1.00, 1.00),
    ("containers",  148, None,                       1280, 1.00, 1.00),
    ("project",     134, None,                       1280, 1.00, 1.00),
    ("ocean",       168, None,                       1280, 1.00, 1.00),
    ("air",         214, None,                       1280, 1.00, 1.00),
    ("sky",         238, None,                       1280, 1.00, 1.00),
    # tighter crops for the tall service cards
    ("iso-tank",    148, (170, 60, 1130, 792),        860, 1.00, 1.00),
    ("hazardous",   106, (240, 40, 1200, 792),        860, 1.00, 1.00),
    # graded backdrops
    ("auth",        232, None,                       1600, 0.72, 0.80),
    ("threshold",   240, None,                       1600, 0.62, 0.88),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for name, frame, box, width, bright, sat in STILLS:
        src = os.path.join(SRC, "f%04d.jpg" % frame)
        im = Image.open(src).convert("RGB")
        if box:
            im = im.crop(box)
        h = round(im.height * width / im.width)
        im = im.resize((width, h), Image.LANCZOS)
        if bright != 1.0:
            im = ImageEnhance.Brightness(im).enhance(bright)
        if sat != 1.0:
            im = ImageEnhance.Color(im).enhance(sat)
        dst = os.path.join(OUT, "%s.jpg" % name)
        im.save(dst, "JPEG", quality=76, optimize=True, progressive=True, subsampling=2)
        total += os.path.getsize(dst)
        print("%-14s f%04d -> %dx%d  %5.0f KB" % (name, frame, im.width, im.height,
                                                  os.path.getsize(dst) / 1024.0))
    print("total %.2f MB" % (total / 1048576.0))


if __name__ == "__main__":
    main()
