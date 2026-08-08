#!/usr/bin/env python3
"""Import hand-authored wall murals into game-ready 64px tiles.

Source art lives in ~/Documents/Sprites/<Wall>/ as one square PNG per tile,
stitching left to right into a single continuous wall.

Unlike the character importer, this one does NOT crop to the content bounding
box and does NOT mask near-white. The end tiles carry 45-degree chamfers in
their alpha channel -- the wall is a trapezoid, full width at the base and
tapering at the top ends. Cropping to content would trim those triangles away
and square the wall off.

Source filenames are inconsistent (Illustrator exported some slices under a
different pattern), so tiles are ordered by their trailing number rather than
by name.
"""
import re
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image

from pixel_grid import TILE, downsample

SRC = Path.home() / "Documents" / "Sprites"
OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "walls"

# Source folder -> output key prefix, how many slices the export contains, and
# an optional middle slice to DROP.
#
# The vinyl wall was authored one tile too wide for the space it hangs in (row a
# is 7 tiles). Its middle slices are byte-identical flat wall, so dropping one
# shortens the wall without touching how it reads -- the two chamfered ends are
# the only slices that carry unique art. Never drop slice 1 or the last one.
MURALS = {
    "Vinyl_wall": ("vinyl-wall", 8, 5),
    # The clothing wall hangs on a 7-tile run now that the right-hand column is
    # wall, so slice 6 is dropped and 7-8 shuffle left into its place.
    "Clothing_Wall": ("clothing-wall", 8, 6),
    # The Basement's two walls. Both are now hand-authored at exactly the
    # length of the row they hang on, so neither drops a slice.
    #   basement-back-wall  row 0, cols 7-11 -- behind the rack room.
    #   basement-ledge-wall row c, cols 1-6  -- the cutout's bottom edge.
    "Basement_Clothing_Wall": ("basement-back-wall", 5, None),
    "Basement_Entrance": ("basement-ledge-wall", 6, None),
}

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
        # Centre-sampled on the authored grid, no crop, no masking -- alpha is
        # load-bearing here (see scripts/pixel_grid.py).
        tile = downsample(img)
        out_path = OUT / f"{prefix}-{out_index}.png"
        tile.save(out_path)
        print(f"  {path.name} -> {out_path.name}")


def main() -> None:
    for folder, (prefix, expected, drop) in MURALS.items():
        print(f"{folder}:")
        import_mural(folder, prefix, expected, drop)


if __name__ == "__main__":
    main()
