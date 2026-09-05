"""
Build the web-ready frame sets for the GML scroll journey.

Input : the 240 source frames (frame-0001.jpg ... frame-0240.jpg) extracted
        from Logistics_journey_video_production_1080p_*-frames.zip
Output: assets/frames/desktop/f0001.jpg ... (1408x792, ~20 MB total)
        assets/frames/mobile/f0001.jpg  ... (854x480,  ~8.5 MB total)
        assets/frames/poster.jpg        (first frame, used for instant paint,
                                         the reduced-motion still and OG image)

Usage:
    python tools/build_frames.py <source-dir>
    python tools/build_frames.py            # defaults to ./_frames_src

Requires Pillow:  python -m pip install Pillow
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "_frames_src")
N = 240

# (folder, width, height, jpeg quality)
SETS = [
    ("desktop", 1408, 792, 72),
    ("mobile",   854, 480, 66),
]


def source_path(i):
    """Source frames are 1-indexed and named frame-0001.jpg."""
    return os.path.join(SRC, "frame-%04d.jpg" % i)


def main():
    if not os.path.isdir(SRC):
        sys.exit("Source directory not found: %s\n"
                 "Extract the frame ZIP there, or pass the path as an argument." % SRC)

    missing = [i for i in range(1, N + 1) if not os.path.exists(source_path(i))]
    if missing:
        sys.exit("Missing %d source frames (first: %s)" % (len(missing), source_path(missing[0])))

    for folder, w, h, q in SETS:
        out = os.path.join(ROOT, "assets", "frames", folder)
        os.makedirs(out, exist_ok=True)
        total = 0
        for i in range(1, N + 1):
            im = Image.open(source_path(i)).convert("RGB").resize((w, h), Image.LANCZOS)
            dst = os.path.join(out, "f%04d.jpg" % i)
            im.save(dst, "JPEG", quality=q, optimize=True, progressive=True, subsampling=2)
            total += os.path.getsize(dst)
        print("%-8s %dx%d q%d -> %d frames, %.1f MB, %.0f KB avg"
              % (folder, w, h, q, N, total / 1048576.0, total / N / 1024.0))

    poster = Image.open(source_path(1)).convert("RGB").resize((1600, 900), Image.LANCZOS)
    poster.save(os.path.join(ROOT, "assets", "frames", "poster.jpg"),
                "JPEG", quality=84, optimize=True, progressive=True)
    print("poster.jpg written")


if __name__ == "__main__":
    main()
