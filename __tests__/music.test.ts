import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A minimal stand-in for HTMLAudioElement. jsdom's own <audio> stubs throw on
 * `.play()` (playback isn't implemented), so real Audio can't be used here —
 * this fake just tracks the state lib/music.ts touches.
 */
class FakeAudio {
  src: string
  loop = false
  preload = ''
  volume = 0
  currentTime = 0
  paused = true

  constructor(src: string) {
    this.src = src
    instances.push(this)
  }
  play() {
    this.paused = false
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
}

let instances: FakeAudio[] = []

beforeEach(() => {
  vi.resetModules()
  instances = []
  vi.stubGlobal('Audio', FakeAudio)
  // The fade animation isn't under test here — a no-op RAF just stops it
  // from ever completing, which is fine since nothing below asserts on volume.
  vi.stubGlobal('requestAnimationFrame', () => 0)
})

describe('music', () => {
  it('seeks the grime track to the 20s drop before it starts playing', async () => {
    const { music } = await import('@/lib/music')
    music.start()
    music.setTrack('grime')

    const grime = instances.find((a) => a.src.includes('grime'))
    expect(grime).toBeDefined()
    // Set synchronously, before play() is even called.
    expect(grime!.currentTime).toBe(20)

    await Promise.resolve() // flush play().then(...)
    expect(grime!.paused).toBe(false)
  })

  it('leaves the lofi track untouched when switching back to it', async () => {
    const { music } = await import('@/lib/music')
    music.start()
    music.setTrack('grime')
    await Promise.resolve()

    music.setTrack('lofi')
    const lofi = instances.find((a) => a.src.includes('nujabes'))
    expect(lofi).toBeDefined()
    expect(lofi!.currentTime).toBe(0)
  })

  it('does not reseek grime on a no-op setTrack call', async () => {
    const { music } = await import('@/lib/music')
    music.start()
    music.setTrack('grime')
    const grime = instances.find((a) => a.src.includes('grime'))!
    grime.currentTime = 45 // pretend playback has moved on

    music.setTrack('grime') // already current — must be a no-op
    expect(grime.currentTime).toBe(45)
  })
})
