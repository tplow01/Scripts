#!/usr/bin/env python3
"""Import the hand-authored floors, entrance rug and checkout into 64px tiles.

Source art lives in ~/Documents/Sprites as square Illustrator exports:

    Floor_Shop_Floor.png        -> floors/shop-floor.png
    Floor_Basement_Floor.png    -> floors/basement-floor.png
    Entrance_Rug_Rug_Left.png   -> rug/entrance-rug-1.png
    Entrance_Rug_Rug_Centre.png -> rug/entrance-rug-2.png
    Entrance_Rug_Rug_Right.png  -> rug/entrance-rug-3.png
    checkout-01..06.png         -> checkout/checkout-1..6.png
    sofa-01..05.png             -> sofa/sofa-1..5.png
    clothing_rail-01..06.png    -> rails/rail-h-1..6.png
    clothing_rail2-01..06.png   -> rails/rail-v-1..6.png
    basement_box.png            -> props/box.png
    box.png                     -> props/box-open.png
    vinyl_collection.png        -> props/vinyl-crate.png
    vinyldeck-01..02.png        -> deck/vinyl-deck-1..2.png
    speaker2.png                -> props/speaker.png
    stairs_Shop.png             -> props/stairs-shop.png
    stairs_Basement.png         -> props/stairs-basement.png

Sources are ~6667px on a 32x32 authored grid; see scripts/pixel_grid.py for why
they are centre-sampled rather than resized.

Like the wall importer, this one does not crop and does not mask: the floors
tile edge-to-edge, and the rug's and counter's chamfered corners are
load-bearing art.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image

from pixel_grid import TILE, downsample

SRC = Path.home() / "Documents" / "Sprites"
ASSETS = Path(__file__).resolve().parent.parent / "public" / "assets"

# source filename -> output path, relative to public/assets.
FLOORS = {
    "Floor_Shop_Floor.png": "floors/shop-floor.png",
    "Floor_Basement_Floor.png": "floors/basement-floor.png",
}

# The entrance rug is one continuous 3-tile run: left, centre, right. These are
# sequential segments, not variants -- slice 2 only reads between 1 and 3.
RUG = {
    "Entrance_Rug_Rug_Left.png": "rug/entrance-rug-1.png",
    "Entrance_Rug_Rug_Centre.png": "rug/entrance-rug-2.png",
    "Entrance_Rug_Rug_Right.png": "rug/entrance-rug-3.png",
}


# The checkout counter, in the order its slices lay into the L footprint:
# 1 top-left, 2 to its right, then 3-6 down the right-hand column.
CHECKOUT = {
    "checkout-%02d.png" % i: "checkout/checkout-%d.png" % i for i in range(1, 7)
}


# The sofa, in the order its slices lay into the L: 1 top-left (the back),
# then 2-5 left to right along the seat row below it.
SOFA = {
    "sofa-%02d.png" % i: "sofa/sofa-%d.png" % i for i in range(1, 6)
}


# The two clothing rails. The horizontal runs 1 (left) -> 6 (right); the
# vertical runs 1 (top) -> 6 (bottom). They meet at the shop's top-right
# corner, so slice 6 of the horizontal and slice 1 of the vertical carry the
# corner art -- keep those ends when trimming.
RAILS = {}
RAILS.update({"clothing_rail-%02d.png" % i: "rails/rail-h-%d.png" % i for i in range(1, 7)})
# The vertical rail's last two slices were exported the wrong way round:
# clothing_rail2-05 carries the bottom end, -06 is a plain middle. Swapped here
# so the run still reads 1 (top) -> 6 (bottom).
RAILS.update({"clothing_rail2-%02d.png" % i: "rails/rail-v-%d.png" % i for i in range(1, 5)})
RAILS["clothing_rail2-06.png"] = "rails/rail-v-5.png"
RAILS["clothing_rail2-05.png"] = "rails/rail-v-6.png"


# Standalone one-tile props, keyed by their art-registry key.
# The vinyl deck: 1 is the left tile, 2 the right; the record straddles the seam.
DECK = {
    "vinyldeck-%02d.png" % i: "deck/vinyl-deck-%d.png" % i for i in range(1, 3)
}

PROPS = {
    "basement_box.png": "props/box.png",
    "box.png": "props/box-open.png",
    "vinyl_collection.png": "props/vinyl-crate.png",
    "speaker2.png": "props/speaker.png",
    "stairs_Shop.png": "props/stairs-shop.png",
    "stairs_Basement.png": "props/stairs-basement.png",
}


def convert(src_name: str, rel_out: str) -> None:
    src = SRC / src_name
    if not src.is_file():
        raise SystemExit(f"missing source: {src}")
    img = Image.open(src).convert("RGBA")
    if img.width != img.height:
        raise SystemExit(f"{src_name}: tiles must be square, got {img.size}")

    out = ASSETS / rel_out
    out.parent.mkdir(parents=True, exist_ok=True)
    downsample(img).save(out)
    print(f"  {src_name} -> {rel_out}")


def main() -> None:
    print("floors:")
    for src_name, rel_out in FLOORS.items():
        convert(src_name, rel_out)
    print("entrance rug:")
    for src_name, rel_out in RUG.items():
        convert(src_name, rel_out)
    print("checkout:")
    for src_name, rel_out in CHECKOUT.items():
        convert(src_name, rel_out)
    print("sofa:")
    for src_name, rel_out in SOFA.items():
        convert(src_name, rel_out)
    print("rails:")
    for src_name, rel_out in RAILS.items():
        convert(src_name, rel_out)
    print("props:")
    for src_name, rel_out in PROPS.items():
        convert(src_name, rel_out)
    print("vinyl deck:")
    for src_name, rel_out in DECK.items():
        convert(src_name, rel_out)


if __name__ == "__main__":
    main()
