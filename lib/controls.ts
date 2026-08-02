/** The complete hardware vocabulary of the SCR!PTS console. */
export type Btn = 'up' | 'down' | 'left' | 'right' | 'A' | 'B'

/** Out-of-game utility buttons rendered as engraved pills on every shell. */
export type UtilityAction = 'social' | 'inventory' | 'mute' | 'help'

export const UTILITY_LABELS: Record<UtilityAction, string> = {
  social: 'SOCIALS',
  inventory: 'INVENTORY',
  mute: 'MUTE',
  help: '?',
}

/** KeyboardEvent.key → console button. Lowercase letters; arrows verbatim. */
export const KEY_TO_BTN: Record<string, Btn> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  // Enter interacts like Z: the scene already accepts it, so without this the
  // dialogue layer would swallow Enter and force a switch to Z mid-conversation.
  z: 'A', Enter: 'A', x: 'B',
}
