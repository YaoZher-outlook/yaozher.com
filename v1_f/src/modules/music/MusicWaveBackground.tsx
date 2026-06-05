import { useMemo, type CSSProperties } from 'react'

import { useAppStore } from '@/store/appStore'

const BAR_COUNT = 56

export default function MusicWaveBackground() {
  const enabled = useAppStore((s) => s.musicBgEnabled)
  const intensity = useAppStore((s) => s.musicBgIntensity)
  const blur = useAppStore((s) => s.musicBgBlur)
  const size = useAppStore((s) => s.musicBgSize)
  const color = useAppStore((s) => s.musicBgColor || s.ledColor)
  const playing = useAppStore((s) => s.musicNowPlaying.playing)

  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const seed = (i * 37) % 19
      return {
        height: 18 + ((i * 11 + seed) % 74),
        delay: -((i * 73) % 1600) / 1000,
        duration: 1.4 + ((i * 17) % 110) / 100,
      }
    })
  }, [])

  if (!enabled || !playing) return null

  return (
    <div
      className="music-wave-bg pointer-events-none fixed inset-x-0 bottom-0 z-[3] overflow-hidden"
      style={
        {
          '--music-wave-color': color,
          '--music-wave-alpha': String(0.12 + intensity * 0.34),
          '--music-wave-scale': '1',
          height: `${Math.round(36 + size * 64)}vh`,
          filter: `blur(${blur}px)`,
          transform: `scaleX(${Math.max(1, size * 0.9)})`,
        } as CSSProperties
      }
      aria-hidden
    >
      <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-[rgb(var(--bg))]/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-6 flex h-[70%] items-end justify-center gap-[0.42vw] px-[7vw]">
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
