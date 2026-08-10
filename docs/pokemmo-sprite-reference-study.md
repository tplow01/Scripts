# PokeMMO sprite reference study — SCR!PTS translation

**Date:** 2026-07-12

PokeMMO is a readability and animation reference only. No PokeMMO or Pokémon
asset may be copied, traced, extracted, bundled, or used as a base. SCR!PTS
characters remain original.

## References reviewed

- [PokeMMO player sprite upgrade discussion](https://forums.pokemmo.com/index.php?/topic/154409-player-sprite-upgrade-gen-5/)
- [PokeMMO character art overhaul discussion](https://forums.pokemmo.com/index.php?/topic/134310-character-art-overhaul-with-assets/)
- [PokeMMO vanity index](https://forums.pokemmo.com/index.php?/topic/145375-pokemmo-vanity-index/)
- [PokeMMO vanity animation templates discussion](https://forums.pokemmo.com/index.php?/topic/103890-more-templates-for-community-vanity-item-contributions/)

## Transferable construction principles

1. **Compact 32×40 overworld proportion.** Large shaped head, compact torso, short but
   articulated limbs, and a consistent bottom-centre anchor.
2. **Direction-specific anatomy.** Front, back, and profile are separately
   constructed; side frames are not flattened front sprites.
3. **Four-phase movement.** Idle → leading step → lifted passing pose → opposite
   step. Arms counter-swing against legs and the body rises in the pass.
4. **Restrained ramps.** Each material uses a small highlight/mid/shadow ramp,
   with a deep outline doing most of the separation work.
5. **Layer-aware customization.** Body, hair, clothing, headwear, and accessories
   share anchors and masks. Complex fashion remains readable because layers are
   designed together.
6. **One strong identifier per scale.** Hair silhouette, top color, chest mark,
   and one accessory do more work than noisy one-pixel detail.

## SCR!PTS application

- Retain the original six hair families and collection-specific outfits.
- Expand Scribbs to 12 directional movement frames (four per direction).
- Expand Heath's scripted profile walk to four phases.
- Preserve visible eyes, nose, ears, hands, sleeve gaps, and shoes.
- Keep brand pink focused on headphones, garment graphics, and deliberate light.
- Generate `public/assets/logo-floor-96.png` once using nearest-neighbour from
  the canonical 480px exact 5× master. Load that native-size floor asset; do not
  redraw the mark procedurally or resample it differently per browser.
