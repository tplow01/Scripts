#!/usr/bin/env python3
"""Import hand-authored character frames into game-ready 64px sprites.

Source art lives in ~/Documents/Sprites/<Character>/ as 12 PNGs per character:
4 directions (Front/Back/Left/Right) x 3 frames (neutral / left foot / right
foot), authored large with a real alpha channel.

Two invariants make the result animate cleanly:

1. **Per-character union bounding box.** All 12 frames of a character share one
   crop box, so the feet stay on the same baseline from frame to frame.
2. **Common content height.** Each character is scaled independently so its
   content is TARGET_HEIGHT tall. The cast therefore renders at equal size,
   and TARGET_HEIGHT is pinned to Scribbs' pre-existing rendered height so his
   on-screen size does not change.

Frames are cropped, nearest-neighbour scaled, and pasted bottom-centre onto a
64x64 transparent canvas.
"""
from pathlib import Path
from PIL import Image

SRC = Path.home() / "Documents" / "Sprites"
OUT = Path(__file__).resolve().parent.parent / "public" / "assets"

CANVAS = 64
# Scribbs' content height in the pre-existing 64px art. Pinning to this keeps
# the player's on-screen size unchanged while equalising the rest of the cast.
TARGET_HEIGHT = 59

# Source folder -> output asset folder / filename prefix.
CHARACTERS = {
    "Scribbs": "scribbs",
    "Heath": "heath",
    "Teo": "teo",
    "TP": "tp",
    "Karl": "karl",
}

# Source direction token -> output direction token.
DIRECTIONS = {"Front": "down", "Back": "up", "Left": "left", "Right": "right"}
# Source frame suffix -> output frame token. "" is the neutral standing frame.
FEET = {"": "both", "_Left": "left", "_Right": "right"}


def source_name(char: str, direction: str, suffix: str) -> str:
    return f"{char}_Sprites_{direction}{suffix}.png"


def content_bbox(img: Image.Image):
    """Bounding box of non-transparent pixels.

    Alpha alone — deliberately no near-white masking. The sources carry a real
    alpha channel, and treating near-white as empty would erase light-coloured
    garments (Scribbs' hoodie, white tees on the rail).
    """
    return img.convert("RGBA").getbbox()


def import_character(char: str, out_name: str) -> None:
    src_dir = SRC / char
    if not src_dir.is_dir():
        raise SystemExit(f"missing source folder: {src_dir}")

    frames = {}
    for direction, out_dir in DIRECTIONS.items():
        for suffix, out_foot in FEET.items():
            path = src_dir / source_name(char, direction, suffix)
            if not path.is_file():
                raise SystemExit(f"missing frame: {path}")
            frames[(out_dir, out_foot)] = Image.open(path).convert("RGBA")

    boxes = [content_bbox(im) for im in frames.values()]
    if any(b is None for b in boxes):
        raise SystemExit(f"{char}: a frame is fully transparent")
    left = min(b[0] for b in boxes)
    top = min(b[1] for b in boxes)
    right = max(b[2] for b in boxes)
    bottom = max(b[3] for b in boxes)
    w, h = right - left, bottom - top

    # Scale on height so every character ends up the same height. Width follows
    # the character's own proportions.
    scale = TARGET_HEIGHT / h
    nw, nh = max(1, round(w * scale)), TARGET_HEIGHT
    if nw > CANVAS:
        raise SystemExit(f"{char}: scaled width {nw}px exceeds the {CANVAS}px canvas")

    dest = OUT / out_name
    dest.mkdir(parents=True, exist_ok=True)
    for (out_dir, out_foot), im in frames.items():
        cropped = im.crop((left, top, right, bottom)).resize((nw, nh), Image.NEAREST)
        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.paste(cropped, ((CANVAS - nw) // 2, CANVAS - nh))
        canvas.save(dest / f"{out_name}-{out_dir}-{out_foot}.png")
    print(f"{char}: source {w}x{h} -> {nw}x{nh}, 12 frames -> {dest}")


def main() -> None:
    for char, out_name in CHARACTERS.items():
        import_character(char, out_name)


if __name__ == "__main__":
    main()
