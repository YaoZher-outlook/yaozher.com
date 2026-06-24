import { useEffect, useMemo, useState, type CSSProperties } from 'react'

import { useAppStore } from '@/store/appStore'

const DESKTOP_BAR_COUNT = 42
const LEAN_BAR_COUNT = 18

function useLeanWave() {
  const [lean, setLean] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px), (prefers-reduced-data: reduce), (prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px), (prefers-reduced-data: reduce), (prefers-reduced-motion: reduce)')
    const update = () => setLean(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return lean
}

export default function MusicWaveBackground() {
  const enabled = useAppStore((s) => s.musicBgEnabled)
  const intensity = useAppStore((s) => s.musicBgIntensity)
  const blur = useAppStore((s) => s.musicBgBlur)
  const size = useAppStore((s) => s.musicBgSize)
  const color = useAppStore((s) => s.musicBgColor || s.ledColor)
  const playing = useAppStore((s) => s.musicNowPlaying.playing)
  const leanWave = useLeanWave()

  const bars = useMemo(() => {
    const count = leanWave ? LEAN_BAR_COUNT : DESKTOP_BAR_COUNT
    return Array.from({ length: count }, (_, i) => {
      const seed = (i * 37) % 19
      return {
        height: 18 + ((i * 11 + seed) % 74),
        delay: -((i * 73) % 1600) / 1000,
        duration: 1.4 + ((i * 17) % 110) / 100,
      }
    })
  }, [leanWave])

  if (!enabled || !playing) return null

  const visualBlur = Math.min(leanWave ? 2 : 3.5, blur)
  const visualHeight = leanWave ? 42 : 56
  const horizontalPadding = Math.max(1.5, (leanWave ? 12 : 14) - size * (leanWave ? 5 : 7))
  const horizontalGap = 0.18 + size * (leanWave ? 0.22 : 0.32)
  const barWidth = Math.max(2, 1.6 + size * (leanWave ? 1.6 : 2.2))

  return (
    <div
      className="music-wave-bg pointer-events-none fixed inset-x-0 bottom-0 z-[3] overflow-hidden"
      style={
        {
          '--music-wave-color': color,
          '--music-wave-alpha': String((leanWave ? 0.08 : 0.12) + intensity * (leanWave ? 0.18 : 0.34)),
          '--music-wave-scale': leanWave ? '0.72' : '1',
          '--music-wave-blur': `${visualBlur}px`,
          '--music-wave-gap': `${horizontalGap}vw`,
          '--music-wave-padding': `${horizontalPadding}vw`,
          '--music-wave-bar-width': `${barWidth}px`,
          height: `${visualHeight}vh`,
          filter: 'none',
          transform: 'none',
        } as CSSProperties
      }
      aria-hidden
    >
      <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-[rgb(var(--bg))]/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-6 flex h-[70%] items-end justify-center gap-[var(--music-wave-gap)] px-[var(--music-wave-padding)]">
        {bars.map((bar, index) => (
          <span
            key={index}
            className="music-wave-bar"
            style={{
              height: `${bar.height}%`,
              animationDelay: `${bar.delay}s`,
              animationDuration: `${bar.duration}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
