"""Shared downsampler for the Illustrator exports in ~/Documents/Sprites.

Every source is authored on a 32x32 pixel grid but exports at ~6667px, which
is NOT an integer multiple of the tile size we ship. Resizing straight down
would land cell edges off the pixel grid and smear 1px details.

So: sample the CENTRE of each authored cell -- exact, no averaging -- and then
scale up to the output tile size with nearest neighbour. Alpha comes along
untouched, which matters for the chamfered ends of the walls and the counter.
"""
from PIL import Image

# The grid the source art is authored on, and the tile size the game ships
# (an exact 2x of that grid, matching the cast at 64px for hi-dpi crispness).
NATIVE = 32
TILE = 64


def downsample(img: Image.Image, native: int = NATIVE, tile: int = TILE) -> Image.Image:
    """Centre-sample `img` onto a native x native grid, then scale to tile."""
    small = Image.new("RGBA", (native, native))
    for y in range(native):
        sy = int((y + 0.5) * img.height / native)
        for x in range(native):
            sx = int((x + 0.5) * img.width / native)
            small.putpixel((x, y), img.getpixel((sx, sy)))
    return small.resize((tile, tile), Image.NEAREST)
