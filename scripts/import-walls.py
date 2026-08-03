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
from typing import Optional

from PIL import Image

SRC = Path.home() / "Documents" / "Sprites"
OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "walls"

# Rendered at 32px by placeTile's setDisplaySize; 64 matches the character
# canvas and buys crispness on hi-dpi displays.
TILE = 64

# Source folder -> output key prefix, how many slices the export contains, and
# an optional middle slice to DROP.
#
# The vinyl wall was authored one tile too wide for the space it hangs in (row a
# is 7 tiles). Its middle slices are byte-identical flat wall, so dropping one
# shortens the wall without touching how it reads -- the two chamfered ends are
# the only slices that carry unique art. Never drop slice 1 or the last one.
MURALS = {
    "Vinyl_wall": ("vinyl-wall", 8, 5),
    "Clothing_Wall": ("clothing-wall", 8, None),
}

# The Basement's two walls are COMPOSED, not hand-authored -- there is no
# Basement_Wall source folder.
#
# Every mural above resolves to just three distinct images: a flat body, a left
# chamfer, and a right chamfer (Vinyl_wall slices 1 and 8 are byte-identical to
# Clothing_Wall's ends, and every middle slice is the same flat tile). So a wall
# of any length with any pair of ends can be built from that vocabulary, and it
# is genuinely the same hand-drawn wall rather than a lookalike.
#
# prefix -> (length, left end, right end). An end is chamfered when it tapers
# into the black void and square when it butts up against floor.
#   basement-back-wall  y=0, x=7-11 -- behind the rack room; void at both ends.
#   basement-ledge-wall y=3, x=1-6  -- the cutout's bottom edge; its right end
#                                      meets the right block's floor, so square.
COMPOSED = {
    "basement-back-wall": (5, "chamfer", "chamfer"),
    "basement-ledge-wall": (6, "chamfer", "square"),
}

# Where the three building blocks come from. Vinyl_wall carries both chamfers.
PARTS_FOLDER = "Vinyl_wall"
PARTS = {"chamfer-left": 1, "body": 4, "chamfer-right": 8}


def slice_index(path: Path) -> int:
    """Trailing number in the filename -- the tile's left-to-right position."""
    match = re.search(r"(\d+)(?!.*\d)", path.stem)
    if not match:
        raise SystemExit(f"cannot read a slice number from: {path.name}")
    return int(match.group(1))


def import_mural(folder: str, prefix: str, expected: int, drop: Optional[int]) -> None:
    src_dir = SRC / folder
    if not src_dir.is_dir():
        raise SystemExit(f"missing source folder: {src_dir}")

    paths = sorted(src_dir.glob("*.png"), key=slice_index)
    if len(paths) != expected:
        raise SystemExit(f"{folder}: expected {expected} slices, found {len(paths)}")

    indices = [slice_index(p) for p in paths]
    if indices != list(range(1, expected + 1)):
        raise SystemExit(f"{folder}: slices are not numbered 1..{expected}: {indices}")

    if drop is not None:
        if not 1 < drop < expected:
            raise SystemExit(
                f"{folder}: drop must be a MIDDLE slice (2..{expected - 1}), got {drop} -- "
                "dropping an end would cut off a chamfer"
            )
        paths = [p for p in paths if slice_index(p) != drop]

    # Stale outputs from a previous run would otherwise linger as an orphaned
    # tile once a mural gets shorter.
    OUT.mkdir(parents=True, exist_ok=True)
    for stale in OUT.glob(f"{prefix}-*.png"):
        stale.unlink()

    # Renumbered 1..N after the drop, so the kept slices stay contiguous.
    for out_index, path in enumerate(paths, start=1):
        img = Image.open(path).convert("RGBA")
        if img.width != img.height:
            raise SystemExit(f"{path.name}: slices must be square, got {img.size}")
        # Nearest-neighbour, no crop, no masking -- alpha is load-bearing here.
        tile = img.resize((TILE, TILE), Image.NEAREST)
        out_path = OUT / f"{prefix}-{out_index}.png"
        tile.save(out_path)
        print(f"  {path.name} -> {out_path.name}")


def load_parts() -> dict:
    """The three distinct slice images, keyed by role, at output size."""
    src_dir = SRC / PARTS_FOLDER
    if not src_dir.is_dir():
        raise SystemExit(f"missing source folder: {src_dir}")
    by_index = {slice_index(p): p for p in src_dir.glob("*.png")}
    parts = {}
    for role, index in PARTS.items():
        path = by_index.get(index)
        if path is None:
            raise SystemExit(f"{PARTS_FOLDER}: no slice {index} for '{role}'")
        parts[role] = Image.open(path).convert("RGBA").resize((TILE, TILE), Image.NEAREST)
    return parts


def compose_mural(prefix: str, length: int, left: str, right: str, parts: dict) -> None:
    if length < 2:
        raise SystemExit(f"{prefix}: a wall needs at least 2 slices, got {length}")

    def end(side: str, which: str) -> Image.Image:
        if which == "square":
            return parts["body"]
        if which == "chamfer":
            return parts[f"chamfer-{side}"]
        raise SystemExit(f"{prefix}: unknown end '{which}' (want 'chamfer' or 'square')")

    slices = [end("left", left)] + [parts["body"]] * (length - 2) + [end("right", right)]

    OUT.mkdir(parents=True, exist_ok=True)
    for stale in OUT.glob(f"{prefix}-*.png"):
        stale.unlink()
    for out_index, tile in enumerate(slices, start=1):
        out_path = OUT / f"{prefix}-{out_index}.png"
        tile.save(out_path)
        print(f"  {out_path.name}")


def main() -> None:
    for folder, (prefix, expected, drop) in MURALS.items():
        print(f"{folder}:")
        import_mural(folder, prefix, expected, drop)

    parts = load_parts()
    for prefix, (length, left, right) in COMPOSED.items():
        print(f"{prefix} (composed, {length} slices):")
        compose_mural(prefix, length, left, right, parts)


if __name__ == "__main__":
    main()
