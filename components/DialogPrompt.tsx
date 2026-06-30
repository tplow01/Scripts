'use client'

import { Press_Start_2P } from 'next/font/google'

const font = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

// FireRed/LeafGreen framing: white fill, navy outer border, pale-blue inner rule.
const frame: React.CSSProperties = {
  background: '#F8F8F8',
  border: '3px solid #4A5878',
  borderRadius: 8,
  boxShadow: 'inset 0 0 0 2px #A8C0E0',
}
const ink = '#384058'

/**
 * In-world Yes/No overlay (rack → "View inventory?", checkout → "Open cart?").
 * Presentational: the page owns selection + input; clicking a row chooses it.
 */
export default function DialogPrompt({
  question,
  sel,
  onChoose,
}: {
  question: string
  sel: 'yes' | 'no'
  onChoose: (choice: 'yes' | 'no') => void
}) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      pointerEvents: 'none',
    }}>
      {/* YES / NO menu — bottom-right, above the text box */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 10px 6px' }}>
        <div style={{ ...frame, padding: '8px 12px 8px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(['yes', 'no'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => onChoose(opt)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                pointerEvents: 'auto',
              }}
            >
              <span style={{ width: 10, color: ink, fontSize: 9 }}>{sel === opt ? '▶' : ''}</span>
              <span className={font.className} style={{ fontSize: 11, color: ink }}>{opt.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dialogue text box */}
      <div style={{ ...frame, margin: '0 8px 8px', padding: '12px 14px' }}>
        <span className={font.className} style={{ fontSize: 9, lineHeight: 1.7, color: ink }}>
          {question}
        </span>
      </div>
    </div>
  )
}
