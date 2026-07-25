#!/usr/bin/env python3
"""Import hand-authored Scribbs frames into game-ready 64px sprites.

All 12 sources share one canvas scale, so a UNION bounding box across every
frame preserves frame-to-frame alignment (feet stay on the same baseline).
Each frame is cropped to that union box, then nearest-neighbour scaled to fit
a 64x64 canvas, anchored bottom-centre.
"""
from pathlib import Path
from PIL import Image

SRC = Path.home() / "Documents"
OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "scribbs"

MAPPING = {
    "scribbs_Front_2_Feet.png": "scribbs-down-both.png",
    "scribbs_Front-Left-Foot.png": "scribbs-down-left.png",
    "scribbs_Front_Right_Foot.png": "scribbs-down-right.png",
    "scribbs_Back_2_Feet.png": "scribbs-up-both.png",
    "scribbs_Back_left_Foot.png": "scribbs-up-left.png",
    "scribbs_Back-Right-Foot.png": "scribbs-up-right.png",
    "scribbs_Left_2_Feet.png": "scribbs-left-both.png",
    "scribbs_Side_Left_Foot.png": "scribbs-left-left.png",
    "scribbs_Side_Right_Foot.png": "scribbs-left-right.png",
    "scribbs_Right_2_Feet.png": "scribbs-right-both.png",
    "scribbs_Right_Left_Foot.png": "scribbs-right-left.png",
    "scribbs_Right_Right_foot.png": "scribbs-right-right.png",
}

CANVAS = 64

def content_bbox(img: Image.Image):
    """Bounding box of non-transparent, non-white pixels."""
    rgba = img.convert("RGBA")
    # White background sources: treat near-white as empty too.
    datas = rgba.getdata()
    mask = Image.new("L", rgba.size, 0)
    mask.putdata([255 if a > 8 and not (r > 246 and g > 246 and b > 246) else 0
                  for (r, g, b, a) in datas])
    return mask.getbbox()

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    frames = {src: Image.open(SRC / src) for src in MAPPING}
    boxes = [content_bbox(im) for im in frames.values()]
    left = min(b[0] for b in boxes); top = min(b[1] for b in boxes)
    right = max(b[2] for b in boxes); bottom = max(b[3] for b in boxes)
    w, h = right - left, bottom - top
    scale = CANVAS / max(w, h)
    for src, out in MAPPING.items():
        im = frames[src].convert("RGBA").crop((left, top, right, bottom))
        nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
        im = im.resize((nw, nh), Image.NEAREST)
        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.paste(im, ((CANVAS - nw) // 2, CANVAS - nh))  # bottom-centre
        canvas.save(OUT / out)
        print(f"{src} -> {out} ({nw}x{nh})")

if __name__ == "__main__":
    main()
