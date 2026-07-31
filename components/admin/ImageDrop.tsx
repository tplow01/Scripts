'use client'

import { ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'

/**
 * Click-or-drop image input. Stores an object URL — session-only by design;
 * after a reload the table falls back to a placeholder tile.
 */
export default function ImageDrop({ label, value, onChange, compact = false }: {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  /** Square tile for gallery grids. */
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const take = (file: File | undefined) => {
    if (file && file.type.startsWith('image/')) onChange(URL.createObjectURL(file))
  }

  return (
    <div>
      {!compact && <span className="block text-[11px] uppercase tracking-[0.14em] text-grey mb-1.5">{label}</span>}
      {value ? (
        <div className={`relative w-full ${compact ? 'h-20' : 'h-32'} rounded-lg overflow-hidden border border-grey/25 bg-[#101010]`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- object URLs need a plain img */}
          <img src={value} alt={label} className="w-full h-full object-contain" />
          <button
            type="button"
            aria-label={`Remove ${label}`}
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 rounded-full bg-ink/80 p-1 text-paper/80 hover:text-paper"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-label={label}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]) }}
          className={`w-full ${compact ? 'h-20' : 'h-32'} rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 text-[12px] transition-colors ${
            over ? 'border-pink text-pink bg-pink/5' : 'border-grey/40 text-grey hover:border-grey/70'
          }`}
        >
          <ImagePlus size={compact ? 16 : 20} />
          {!compact && 'Drop image or click to browse'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => take(e.target.files?.[0])}
      />
    </div>
  )
}
