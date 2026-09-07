'use client'

import { UTILITY_LABELS, type UtilityAction } from '@/lib/controls'
import { DmgBtn, FlatIconBtn, QuestionGlyph, SpeakerIcon } from './UtilityBtn'
import { FOOTING_EDGE, FOOTING_FACE } from './theme'

/**
 * Total footing height as a CSS length: the button row plus the device's bottom
 * safe area. The plinth absorbs the inset instead of padding it off the row, so
 * the iPhone home indicator rests on black and the buttons keep their full size.
 */
export function footingHeight(rowHeight: number) {
  return `calc(${rowHeight}px + env(safe-area-inset-bottom))`
}

/**
 * The handheld's bottom footing: a black plinth pinned to the base of the deck,
 * carrying the utility row (mute · SOCIALS · INVENTORY · ?).
 *
 * Without it these controls were white-on-grey, floating loose on the shell body
 * and running into the home indicator. The plinth mirrors the black wordmark
 * strip under the LCD, so the shell reads as bezel · body · footing — a real
 * handheld — and gives every mark on it a high-contrast base.
 */
export default function ShellFooting({
  rowHeight, muted, onUtility, pillWidth, gap = 20, iconSize = 19, edgePad = 10,
}: {
  /** Height of the button row itself, before the safe-area inset is added. */
  rowHeight: number
  muted: boolean
  onUtility: (a: UtilityAction) => void
  pillWidth: number
  gap?: number
  iconSize?: number
  /** Inset of the corner icons from the shell edge, before safe-area insets. */
  edgePad?: number
}) {
  const left = `max(${edgePad}px, env(safe-area-inset-left))`
  const right = `max(${edgePad}px, env(safe-area-inset-right))`
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      height: footingHeight(rowHeight),
      background: FOOTING_FACE, boxShadow: FOOTING_EDGE,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      paddingLeft: left, paddingRight: right,
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxSizing: 'border-box',
    }}>
      <div style={{ position: 'absolute', left }}>
        <FlatIconBtn ariaLabel={muted ? 'Unmute' : 'Mute'} onPress={() => onUtility('mute')}>
          <SpeakerIcon size={iconSize} muted={muted} />
        </FlatIconBtn>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap }}>
        <DmgBtn label={UTILITY_LABELS.social} pillWidth={pillWidth} onPress={() => onUtility('social')} />
        <DmgBtn label={UTILITY_LABELS.inventory} pillWidth={pillWidth} onPress={() => onUtility('inventory')} />
      </div>
      <div style={{ position: 'absolute', right }}>
        <FlatIconBtn ariaLabel="Help" onPress={() => onUtility('help')}>
          <QuestionGlyph size={iconSize - 1} />
        </FlatIconBtn>
      </div>
    </div>
  )
}
