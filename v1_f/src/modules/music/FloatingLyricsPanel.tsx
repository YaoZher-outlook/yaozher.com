import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { Lock, X } from 'lucide-react'

import { resolveAssetUrl } from '@/api/assets'
import { useAppStore } from '@/store/appStore'
import { activeLyricIndex, fallbackLyrics, lyricVisualStyle, lyricWindow, parseLyrics, type LyricLine } from './lyrics'

const PANEL_MAX_WIDTH = 420
const PANEL_MIN_HEIGHT = 180
const PANEL_VERTICAL_MARGIN = 24
const PANEL_DEFAULT_Y_RATIO = 0.24

function panelWidth() {
  if (typeof window === 'undefined') return PANEL_MAX_WIDTH
  return Math.min(PANEL_MAX_WIDTH, Math.max(280, window.innerWidth - 16))
}

function clampPanelPosition(x: number, y: number, height = PANEL_MIN_HEIGHT) {
  const width = panelWidth()
  const margin = window.innerWidth <= 767 ? 8 : 0
  const maxX = Math.max(margin, window.innerWidth - width - margin)
  const maxY = Math.max(0, window.innerHeight - height - PANEL_VERTICAL_MARGIN)
  return {
    x: Math.max(margin, Math.min(maxX, x)),
    y: Math.max(0, Math.min(maxY, y)),
  }
}

function defaultPanelPosition(height = PANEL_MIN_HEIGHT) {
  if (typeof window === 'undefined') return { x: 0, y: PANEL_VERTICAL_MARGIN }
  const width = panelWidth()
  return clampPanelPosition(
    window.innerWidth - width - (window.innerWidth <= 767 ? 8 : 0),
    Math.round((window.innerHeight - height) * PANEL_DEFAULT_Y_RATIO),
    height,
  )
}

function writePanelPosition(panel: HTMLDivElement | null, pos: { x: number; y: number }) {
  if (!panel) return
  panel.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
}

export default function FloatingLyricsPanel() {
  const enabled = useAppStore((s) => s.lyricsPanelEnabled)
  const opacity = useAppStore((s) => s.lyricsPanelOpacity)
  const fontSize = useAppStore((s) => s.lyricsFontSize)
  const follow = useAppStore((s) => s.lyricsFollow)
  const lineCount = useAppStore((s) => s.lyricsLineCount)
  const blur = useAppStore((s) => s.lyricsBlur)
  const nowPlaying = useAppStore((s) => s.musicNowPlaying)
  const setLyricsPanelEnabled = useAppStore((s) => s.setLyricsPanelEnabled)
  const requestMusicSeek = useAppStore((s) => s.requestMusicSeek)

  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [initialPos] = useState(() => defaultPanelPosition())
  const [locked, setLocked] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const posRef = useRef(initialPos)
  const pendingPosRef = useRef(initialPos)
  const frameRef = useRef<number | null>(null)
  const placedRef = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const dragging = useRef(false)

  const lyricUrl = resolveAssetUrl(nowPlaying.lyricUrl)
  const active = activeLyricIndex(lyrics, nowPlaying.currentTime)
  const visible = lyricWindow(lyrics, active < 0 ? 0 : active, lineCount)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!nowPlaying.title) {
        setLyrics([])
        return
      }
      if (!lyricUrl) {
        setLyrics(fallbackLyrics(nowPlaying.title, nowPlaying.artist))
        return
      }
      try {
        const response = await fetch(lyricUrl)
        if (!response.ok) throw new Error('lyrics not found')
        const raw = await response.text()
        if (!cancelled) setLyrics(parseLyrics(raw))
      } catch {
        if (!cancelled) setLyrics(fallbackLyrics(nowPlaying.title, nowPlaying.artist))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [lyricUrl, nowPlaying.title, nowPlaying.artist])

  useLayoutEffect(() => {
    if (!enabled) {
      placedRef.current = false
      return
    }
    if (placedRef.current) return

    placedRef.current = true
    const height = panelRef.current?.getBoundingClientRect().height ?? PANEL_MIN_HEIGHT
    const next = defaultPanelPosition(height)
    posRef.current = next
    pendingPosRef.current = next
    writePanelPosition(panelRef.current, next)
  }, [enabled])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return
      const height = panelRef.current?.getBoundingClientRect().height ?? PANEL_MIN_HEIGHT
      pendingPosRef.current = clampPanelPosition(
        event.clientX - dragOffset.current.x,
        event.clientY - dragOffset.current.y,
        height,
      )
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        posRef.current = pendingPosRef.current
        writePanelPosition(panelRef.current, posRef.current)
      })
    }
    const onUp = () => {
      dragging.current = false
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const onResize = () => {
      const height = panelRef.current?.getBoundingClientRect().height ?? PANEL_MIN_HEIGHT
      posRef.current = clampPanelPosition(posRef.current.x, posRef.current.y, height)
      pendingPosRef.current = posRef.current
      writePanelPosition(panelRef.current, posRef.current)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const panelStyle = useMemo(
    () => ({
      left: 0,
      top: 0,
      transform: `translate3d(${initialPos.x}px, ${initialPos.y}px, 0)`,
      willChange: 'transform',
      background: locked ? 'transparent' : `rgb(var(--glass-tint) / ${opacity})`,
      backdropFilter: locked ? 'none' : `blur(${blur}px) saturate(var(--glass-saturate))`,
      WebkitBackdropFilter: locked ? 'none' : `blur(${blur}px) saturate(var(--glass-saturate))`,
    }),
    [initialPos.x, initialPos.y, opacity, blur, locked],
  )

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current
    if (!panel) return
    event.preventDefault()
    dragging.current = true
    const rect = panel.getBoundingClientRect()
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const onLyricsWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (Math.abs(event.deltaY) < 4) return
    requestMusicSeek(event.deltaY > 0 ? 5 : -5)
  }

  if (!enabled) return null

  return (
    <div
      ref={panelRef}
      className={[
        'group fixed z-[35] w-[min(420px,calc(100vw-16px))] rounded-2xl p-4 transition-[background,border-color,box-shadow,backdrop-filter] duration-200',
        locked ? 'border border-transparent shadow-none' : 'border border-[var(--glass-border)] shadow-2xl',
      ].join(' ')}
      style={panelStyle}
    >
      {locked ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setLocked(false)}
          className="glass absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-[rgb(var(--fg))] opacity-0 transition hover:text-[color:var(--led-color)] group-hover:opacity-100"
          aria-label="解锁歌词窗口"
          title="解锁歌词窗口"
        >
          <Lock size={15} />
        </button>
      ) : (
        <div onPointerDown={onPointerDown} className="-mx-4 -mt-4 mb-3 flex cursor-grab items-center justify-between rounded-t-2xl border-b border-[var(--glass-border)] px-3 py-2 text-[rgb(var(--muted))] active:cursor-grabbing">
          <div className="h-1 w-12 rounded-full bg-[rgb(var(--fg))] opacity-35" />
          <div className="flex items-center gap-1">
            <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => setLocked(true)} className="grid h-7 w-7 place-items-center rounded-md transition hover:bg-white/10 hover:text-[rgb(var(--fg))]" aria-label="锁定歌词窗口" title="锁定歌词窗口">
              <Lock size={15} />
            </button>
            <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => setLyricsPanelEnabled(false)} className="grid h-7 w-7 place-items-center rounded-md transition hover:bg-white/10 hover:text-[rgb(var(--fg))]" aria-label="关闭歌词窗口">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="hidden">
        <div className="truncate text-sm font-semibold">{nowPlaying.title || '暂无播放歌曲'}</div>
        <div className="mt-0.5 truncate text-xs text-[rgb(var(--muted))]">{nowPlaying.artist || '打开音乐播放器后显示歌词'}</div>
      </div>

      <div className="space-y-2 text-center" onWheel={onLyricsWheel} title="滚轮快进/后退">
        {visible.length ? (
          visible.map((line) => {
            const isActive = line.absoluteIndex === active
            return (
              <div
                key={`${line.absoluteIndex}-${line.time}`}
                className={[
                  'truncate transition-all duration-300',
                  follow && isActive ? 'font-semibold text-[color:var(--led-color)]' : 'text-[rgb(var(--fg))]/68',
                ].join(' ')}
                style={{
                  fontSize: follow && isActive ? fontSize : Math.max(12, fontSize - 5),
                  lineHeight: 1.35,
                  ...lyricVisualStyle(line.absoluteIndex, active),
                }}
              >
                {line.text}
              </div>
            )
          })
        ) : (
          <div className="py-4 text-sm text-[rgb(var(--muted))]">等待歌词...</div>
        )}
      </div>
    </div>
  )
}
