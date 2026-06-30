import type { Product } from '@/types/product'

const BACK_WHITE = '/products/cutout/back-white.png'
const BACK_GREEN = '/products/cutout/back-green.png'
const BACK_BLACK = '/products/cutout/back-black.png'

const SHARED = {
  price: 44,
  collection: '1-800-Cyber-Love',
  status: 'pre-order' as const,
  shipDate: 'July 2026',
  sizes: ['S', 'M', 'L', 'XL'],
  fabric: '100% Cotton',
  fabricWeight: '260 g/m²',
  fit: 'Cropped and boxy fit.',
  modelNote: 'Model is 6\'2", 168lbs in size Medium.',
  careInstructions: [
    'Machine wash at 30°C (gentle cycle)',
    'Do not bleach',
    'Tumble dry low',
    'Iron at low temperature, avoid ironing on print',
    'Do not dry clean',
  ],
}

// Editorial copy, one voice per emotion. Each piece in the "Emotions" collection
// names a brain-state you cycle through trying to figure life out — printed loud,
// cut oversized, given the digital treatment.
const EMOTION_COPY: Record<string, string> = {
  Anxiety:
    'For the 3am brain that won’t switch off. "ANXIETY" prints the static you feel but never say — an oversized, boxy cut built to be lived in on the days everything is a little too much.',
  Love:
    '"LOVE" is the soft one — the rush, the text back, the version of you that lets people in. Cropped, heavy, and printed like a confession you’d actually wear out the door.',
  Confusion:
    'For the in-between, the question with no clean answer. "CONFUSION" wears the not-knowing on purpose — a boxy oversized tee for anyone still figuring out which way is up.',
  Rage:
    '"RAGE" is the loud one — the heat you keep behind your teeth, finally on the outside. Oversized, unbothered, and printed to be seen from across the room.',
}

function description(emotion: string) {
  return (
    EMOTION_COPY[emotion] ??
    `"${emotion}" — part of the Emotions collection. Oversized, heavyweight, given the digital treatment. Not just clothing; a way to wear what you feel.`
  )
}

export const CYBER_LOVE_PRODUCTS: Product[] = [
  {
    ...SHARED,
    id: '1',
    emotion: 'ANXIETY',
    colorway: 'White',
    name: '"ANXIETY" — White',
    description: description('Anxiety'),
    image: '/products/cutout/anxiety-white.png',
    backImage: BACK_WHITE,
    slug: 'anxiety-white',
  },
  {
    ...SHARED,
    id: '2',
    emotion: 'LOVE',
    colorway: 'White',
    name: '"LOVE" — White',
    description: description('Love'),
    image: '/products/cutout/love-white.png',
    backImage: BACK_WHITE,
    slug: 'love-white',
  },
  {
    ...SHARED,
    id: '3',
    emotion: 'CONFUSION',
    colorway: 'White',
    name: '"CONFUSION" — White',
    description: description('Confusion'),
    image: '/products/cutout/confusion-white.png',
    backImage: BACK_WHITE,
    slug: 'confusion-white',
  },
  {
    ...SHARED,
    id: '4',
    emotion: 'RAGE',
    colorway: 'White',
    name: '"RAGE" — White',
    description: description('Rage'),
    image: '/products/cutout/rage-white.png',
    backImage: BACK_WHITE,
    slug: 'rage-white',
  },
  {
    ...SHARED,
    id: '5',
    emotion: 'ANXIETY',
    colorway: 'Army Green',
    name: '"ANXIETY" — Army Green',
    description: description('Anxiety'),
    image: '/products/cutout/anxiety-green.png',
    backImage: BACK_GREEN,
    slug: 'anxiety-green',
  },
  {
    ...SHARED,
    id: '6',
    emotion: 'LOVE',
    colorway: 'Army Green',
    name: '"LOVE" — Army Green',
    description: description('Love'),
    image: '/products/cutout/love-green.png',
    backImage: BACK_GREEN,
    slug: 'love-green',
  },
  {
    ...SHARED,
    id: '7',
    emotion: 'CONFUSION',
    colorway: 'Army Green',
    name: '"CONFUSION" — Army Green',
    description: description('Confusion'),
    image: '/products/cutout/confusion-green.png',
    backImage: BACK_GREEN,
    slug: 'confusion-green',
  },
  {
    ...SHARED,
    id: '8',
    emotion: 'RAGE',
    colorway: 'Army Green',
    name: '"RAGE" — Army Green',
    description: description('Rage'),
    image: '/products/cutout/rage-green.png',
    backImage: BACK_GREEN,
    slug: 'rage-green',
  },
]

export const BASEMENT_PRODUCTS: Product[] = [
  {
    ...SHARED,
    id: 'b1',
    emotion: 'MJ',
    colorway: 'White',
    name: '"MJ" — White',
    description: 'From The Basement.',
    image: '/products/cutout/mj-tee.png',
    backImage: BACK_WHITE,
    slug: 'mj-white',
    collection: 'Basement',
  },
  {
    ...SHARED,
    id: 'b2',
    emotion: 'ARE YOU OKAY',
    colorway: 'White',
    name: '"ARE YOU OKAY" — White',
    description: 'From The Basement.',
    image: '/products/cutout/are-you-okay-white.png',
    backImage: BACK_WHITE,
    slug: 'are-you-okay-white',
    collection: 'Basement',
  },
  {
    ...SHARED,
    id: 'b3',
    emotion: 'ARE YOU OKAY',
    colorway: 'Army Green',
    name: '"ARE YOU OKAY" — Army Green',
    description: 'From The Basement.',
    image: '/products/cutout/are-you-okay-green.png',
    backImage: BACK_GREEN,
    slug: 'are-you-okay-green',
    collection: 'Basement',
  },
  {
    ...SHARED,
    id: 'b4',
    emotion: 'ARE YOU OKAY',
    colorway: 'Black',
    name: '"ARE YOU OKAY" — Black',
    description: 'From The Basement.',
    image: '/products/cutout/are-you-okay-black.png',
    backImage: BACK_BLACK,
    slug: 'are-you-okay-black',
    collection: 'Basement',
  },
]
