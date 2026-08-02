#!/usr/bin/env python3
"""Import hand-authored wall murals into game-ready 64px tiles.

Source art lives in ~/Documents/Sprites/<Wall>/ as one square PNG per tile,
stitching left to right into a single continuous wall.

Unlike the character importer, this one does NOT crop to the content bounding
box and does NOT mask near-white. The end tiles carry 45-degree chamfers in
their alpha channel -- the wall is a trapezoid, full width at the base and
tapering at the top ends. Cropping to content would trim those triangles away
and square the wall off.

Source filenames are inconsistent (Illustrator exported the last clothing slice
under a different pattern), so tiles are ordered by their trailing number
rather than by name.
"""
import re
from pathlib import Path

from PIL import Image

SRC = Path.home() / "Documents" / "Sprites"
OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "walls"

# Rendered at 32px by placeTile's setDisplaySize; 64 matches the character
# canvas and buys crispness on hi-dpi displays.
TILE = 64

# Source folder -> output key prefix, and how many slices to expect.
MURALS = {
    "Vinyl_wall": ("vinyl-wall", 8),
    "Clothing_Wall": ("clothing-wall", 8),
}


def slice_index(path: Path) -> int:
    """Trailing number in the filename -- the tile's left-to-right position."""
    match = re.search(r"(\d+)(?!.*\d)", path.stem)
    if not match:
        raise SystemExit(f"cannot read a slice number from: {path.name}")
    return int(match.group(1))


def import_mural(folder: str, prefix: str, expected: int) -> None:
    src_dir = SRC / folder
    if not src_dir.is_dir():
        raise SystemExit(f"missing source folder: {src_dir}")

    paths = sorted(src_dir.glob("*.png"), key=slice_index)
    if len(paths) != expected:
        raise SystemExit(f"{folder}: expected {expected} slices, found {len(paths)}")

    indices = [slice_index(p) for p in paths]
    if indices != list(range(1, expected + 1)):
        raise SystemExit(f"{folder}: slices are not numbered 1..{expected}: {indices}")

    OUT.mkdir(parents=True, exist_ok=True)
    for path in paths:
        img = Image.open(path).convert("RGBA")
        if img.width != img.height:
            raise SystemExit(f"{path.name}: slices must be square, got {img.size}")
        # Nearest-neighbour, no crop, no masking -- alpha is load-bearing here.
        tile = img.resize((TILE, TILE), Image.NEAREST)
        out_path = OUT / f"{prefix}-{slice_index(path)}.png"
        tile.save(out_path)
        print(f"  {path.name} -> {out_path.name}")


def main() -> None:
    for folder, (prefix, expected) in MURALS.items():
        print(f"{folder}:")
        import_mural(folder, prefix, expected)


if __name__ == "__main__":
    main()
