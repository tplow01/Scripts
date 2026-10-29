'use client'

import { ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'

import { uploadProductImage } from '@/lib/admin/uploadImage'

/**
 * Click-or-drop image input. A dropped file shows at once as a local preview
 * while it uploads to /api/admin/media; `onChange` then receives the stored
 * image's permanent URL. If the upload fails the preview is dropped and the
 * reason shown under the tile, so the product never keeps a URL that would
 * not survive a reload.
 */
export default function ImageDrop({ label, value, onChange, productId, compact = false }: {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  /** Owner of the image; uploads are filed under it in storage. */
  productId: string
  /** Square tile for gallery grids. */
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const take = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    const preview = URL.createObjectURL(file)
    setPending(preview)
    setError(null)
    try {
      onChange(await uploadProductImage(file, productId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The image could not be uploaded.')
    } finally {
      setPending(null)
      URL.revokeObjectURL(preview)
    }
  }

  const shown = pending ?? value
  const height = compact ? 'h-20' : 'h-32'

  return (
    <div>
      {!compact && <span className="block text-[11px] uppercase tracking-[0.14em] text-grey mb-1.5">{label}</span>}
      {shown ? (
        <div className={`relative w-full ${height} rounded-lg overflow-hidden border border-grey/25 bg-[#101010]`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- previews are object URLs; stored images are plain remote files */}
          <img src={shown} alt={label} className="w-full h-full object-contain" />
          {pending ? (
            <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-1 text-center text-[11px] uppercase tracking-[0.14em] text-paper/80">
              Uploading…
            </span>
          ) : (
            <button
              type="button"
              aria-label={`Remove ${label}`}
              onClick={() => onChange(null)}
              className="absolute top-1.5 right-1.5 rounded-full bg-ink/80 p-1 text-paper/80 hover:text-paper"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          aria-label={label}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files[0]) }}
          className={`w-full ${height} rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 text-[12px] transition-colors ${
            over ? 'border-pink text-pink bg-pink/5' : 'border-grey/40 text-grey hover:border-grey/70'
          }`}
        >
          <ImagePlus size={compact ? 16 : 20} />
          {!compact && 'Drop image or click to browse'}
        </button>
      )}
      {error && <p className="mt-1 text-[11px] text-pink-deep">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          void take(e.target.files?.[0])
          // Let the same file be chosen again after a failed upload.
          e.target.value = ''
        }}
      />
    </div>
  )
}
