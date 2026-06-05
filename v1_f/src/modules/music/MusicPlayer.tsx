import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Captions,
  Disc3,
  ListMusic,
  Music2,
  Pause,
  Pin,
  PinOff,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react'

import { resolveAssetUrl } from '@/api/assets'
import { getMusicCover, getMusicPlaylists } from '@/api/music'
import { useAppStore } from '@/store/appStore'
import type { MusicPlaylistVo, MusicTrackVo } from '@/types/music'
import { activeLyricIndex, fallbackLyrics, lyricVisualStyle, lyricWindow, parseLyrics, type LyricLine } from './lyrics'

type PlayMode = 'sequence' | 'shuffle' | 'repeat-one'
type Edge = 'left' | 'right'

type MusicPlayerProps = {
  anchor?: { left: number; top: number }
  collapseBoundaryLeft?: number
  revealSignal?: number
  onRequestReanchor?: () => void
}

const PANEL_WIDTH = 420
const PANEL_HEIGHT = 500
const COLLAPSED_WIDTH = 116
const COLLAPSED_HEIGHT = 48

function buildShuffleQueue(length: number, avoidFirst?: number, includeAvoided = true) {
  const queue = Array.from({ length }, (_, i) => i).filter((i) => includeAvoided || i !== avoidFirst)
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[queue[i], queue[j]] = [queue[j], queue[i]]
  }
  if (queue.length > 1 && queue[0] === avoidFirst) {
    const swapIndex = queue.findIndex((i) => i !== avoidFirst)
    ;[queue[0], queue[swapIndex]] = [queue[swapIndex], queue[0]]
  }
  return queue
}

function modeIcon(mode: PlayMode) {
  if (mode === 'shuffle') return <Shuffle size={16} />
  if (mode === 'repeat-one') return <Repeat1 size={16} />
  return <Repeat size={16} />
}

function modeTitle(mode: PlayMode) {
  if (mode === 'shuffle') return '随机播放'
  if (mode === 'repeat-one') return '单曲循环'
  return '顺序播放'
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function MusicPlayer({ anchor, collapseBoundaryLeft = 128, revealSignal = 0, onRequestReanchor }: MusicPlayerProps) {
  const setOpen = useAppStore((s) => s.setMusicPlayerOpen)
  const setLyricsPanelEnabled = useAppStore((s) => s.setLyricsPanelEnabled)
  const setMusicNowPlaying = useAppStore((s) => s.setMusicNowPlaying)
  const musicSeekRequest = useAppStore((s) => s.musicSeekRequest)

  const dragRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const coverCache = useRef(new Map<string, string>())
  const collapseTimer = useRef<number | null>(null)
  const shuffleQueue = useRef<number[]>([])
  const playHistory = useRef<number[]>([])
  const autoPlayAfterTrackChange = useRef(false)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const dragFrame = useRef<number | null>(null)
  const pendingDragPos = useRef<{ x: number; y: number } | null>(null)
  const hasUserMoved = useRef(false)

  const [pos, setPos] = useState({ x: collapseBoundaryLeft + 12, y: 24 })
  const posRef = useRef(pos)
  const [playlists, setPlaylists] = useState<MusicPlaylistVo[]>([])
  const [playlistId, setPlaylistId] = useState('')
  const [index, setIndex] = useState(0)
  const [mode, setMode] = useState<PlayMode>('shuffle')
  const [pinned, setPinned] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [collapsedEdge, setCollapsedEdge] = useState<Edge>('left')
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [remoteCover, setRemoteCover] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lyricsExpanded, setLyricsExpanded] = useState(false)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])

  const clampPosition = (x: number, y: number) => {
    const margin = 0
    const rect = dragRef.current?.getBoundingClientRect()
    const width = rect?.width || PANEL_WIDTH
    const height = rect?.height || PANEL_HEIGHT
    return {
      x: Math.max(margin, Math.min(window.innerWidth - width - margin, x)),
      y: Math.max(margin, Math.min(window.innerHeight - height - margin, y)),
    }
  }

  const clearCollapseTimer = () => {
    if (collapseTimer.current) {
      window.clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
  }

  const reveal = () => {
    clearCollapseTimer()
    setCollapsed(false)
  }

  const scheduleCollapse = () => {
    if (pinned || dragging.current) return
    clearCollapseTimer()
    collapseTimer.current = window.setTimeout(() => {
      setCollapsedEdge(pos.x + PANEL_WIDTH / 2 > window.innerWidth / 2 ? 'right' : 'left')
      setCollapsed(true)
    }, 420)
  }

  useEffect(() => {
    if (!anchor || hasUserMoved.current) return
    requestAnimationFrame(() => {
      const next = clampPosition(anchor.left, anchor.top)
      posRef.current = next
      setPos(next)
    })
  }, [anchor, collapseBoundaryLeft])

  useEffect(() => {
    posRef.current = pos
  }, [pos])

  useEffect(() => {
    if (revealSignal) reveal()
  }, [revealSignal])

  useEffect(() => {
    const onResize = () => {
      onRequestReanchor?.()
      setPos((p) => {
        const next = clampPosition(p.x, p.y)
        posRef.current = next
        return next
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [onRequestReanchor, collapseBoundaryLeft])

  useEffect(() => {
    const flushDrag = () => {
      dragFrame.current = null
      const el = dragRef.current
      const next = pendingDragPos.current
      if (!el || !next) return
      const base = posRef.current
      el.style.transform = `translate3d(${next.x - base.x}px, ${next.y - base.y}px, 0)`
    }
    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return
      pendingDragPos.current = clampPosition(ev.clientX - dragOffset.current.x, ev.clientY - dragOffset.current.y)
      if (dragFrame.current == null) dragFrame.current = window.requestAnimationFrame(flushDrag)
    }
    const onUp = () => {
      if (dragFrame.current != null) {
        window.cancelAnimationFrame(dragFrame.current)
        dragFrame.current = null
      }
      const el = dragRef.current
      dragging.current = false
      if (pendingDragPos.current) {
        const next = pendingDragPos.current
        posRef.current = next
        if (el) {
          el.style.left = `${next.x}px`
          el.style.top = `${next.y}px`
          el.style.transform = ''
          el.classList.remove('music-player-dragging')
        }
        setPos(next)
      } else if (el) {
        el.classList.remove('music-player-dragging')
      }
      pendingDragPos.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (dragFrame.current != null) window.cancelAnimationFrame(dragFrame.current)
    }
  }, [collapseBoundaryLeft])

  useEffect(() => clearCollapseTimer, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setError(null)
        const res = await getMusicPlaylists()
        if (cancelled) return
        const list = res.data ?? []
        setPlaylists(list)
        setPlaylistId((prev) => prev || list[0]?.id || '')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const playlist = useMemo(() => playlists.find((p) => p.id === playlistId) ?? playlists[0], [playlistId, playlists])
  const tracks = playlist?.tracks ?? []
  const track: MusicTrackVo | undefined = tracks[index]
  const trackUrl = resolveAssetUrl(track?.url)
  const localCover = resolveAssetUrl(track?.coverUrl)
  const coverUrl = localCover ?? remoteCover ?? undefined
  const lyricUrl = resolveAssetUrl(track?.lyricUrl)
  const currentLyricIndex = activeLyricIndex(lyrics, currentTime)
  const visibleLyrics = lyricWindow(lyrics, currentLyricIndex < 0 ? 0 : currentLyricIndex, 5)

  useEffect(() => {
    playHistory.current = []
    if (!tracks.length) {
      shuffleQueue.current = []
      setIndex(0)
      return
    }
    const first = Math.floor(Math.random() * tracks.length)
    setIndex(first)
    shuffleQueue.current = buildShuffleQueue(tracks.length, first, false)
  }, [playlistId, tracks.length])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !trackUrl) return
    audio.src = trackUrl
    audio.load()
    setCurrentTime(0)
    setDuration(0)
    const shouldPlay = playing || autoPlayAfterTrackChange.current
    autoPlayAfterTrackChange.current = false
    if (shouldPlay) void audio.play().catch(() => setPlaying(false))
  }, [trackUrl])

  useEffect(() => {
    let cancelled = false
    async function loadCover() {
      setRemoteCover(null)
      if (!track || track.coverUrl) return
      const cached = coverCache.current.get(track.id)
      if (cached) {
        setRemoteCover(cached)
        return
      }
      try {
        const res = await getMusicCover({ artist: track.artist, title: track.title })
        if (cancelled) return
        if (res.data) {
          coverCache.current.set(track.id, res.data)
          setRemoteCover(res.data)
        }
      } catch {
        // Cover search is decorative; playback should continue if it fails.
      }
    }
    void loadCover()
    return () => {
      cancelled = true
    }
  }, [track?.id, track?.coverUrl, track?.artist, track?.title])

  useEffect(() => {
    let cancelled = false
    async function loadLyrics() {
      if (!track) {
        setLyrics([])
        return
      }
      if (!lyricUrl) {
        setLyrics(fallbackLyrics(track.title, track.artist))
        return
      }
      try {
        const response = await fetch(lyricUrl)
        if (!response.ok) throw new Error('lyrics not found')
        const raw = await response.text()
        if (!cancelled) setLyrics(parseLyrics(raw))
      } catch {
        if (!cancelled) setLyrics(fallbackLyrics(track.title, track.artist))
      }
    }
    void loadLyrics()
    return () => {
      cancelled = true
    }
  }, [track?.id, track?.title, track?.artist, lyricUrl])

  useEffect(() => {
    setMusicNowPlaying({
      title: track?.title,
      artist: track?.artist,
      lyricUrl: track?.lyricUrl,
      currentTime,
      duration,
      playing,
    })
  }, [track?.title, track?.artist, track?.lyricUrl, currentTime, duration, playing, setMusicNowPlaying])

  const goNext = () => {
    setIndex((prev) => {
      if (!tracks.length) return 0
      if (mode === 'shuffle') {
        if (tracks.length === 1) return 0
        if (!shuffleQueue.current.length) shuffleQueue.current = buildShuffleQueue(tracks.length, prev, true)
        const next = shuffleQueue.current.shift() ?? prev
        if (next !== prev) playHistory.current.push(prev)
        return next
      }
      const next = (prev + 1) % tracks.length
      if (next !== prev) playHistory.current.push(prev)
      return next
    })
  }

  const goPrev = () => {
    setIndex((prev) => {
      if (!tracks.length) return 0
      if (mode === 'shuffle') return playHistory.current.pop() ?? prev
      const next = (prev - 1 + tracks.length) % tracks.length
      if (next !== prev) playHistory.current.push(prev)
      return next
    })
  }

  const selectTrack = (next: number) => {
    if (Number.isNaN(next) || next < 0 || next >= tracks.length) return
    if (next !== index) playHistory.current.push(index)
    setIndex(next)
    if (mode === 'shuffle') shuffleQueue.current = buildShuffleQueue(tracks.length, next, false)
  }

  const onTogglePlay = async () => {
    const audio = audioRef.current
    if (!audio || !trackUrl) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    await audio.play()
    setPlaying(true)
  }

  const cycleMode = () => {
    setMode((m) => {
      const next = m === 'sequence' ? 'shuffle' : m === 'shuffle' ? 'repeat-one' : 'sequence'
      if (next === 'shuffle') {
        playHistory.current = []
        shuffleQueue.current = buildShuffleQueue(tracks.length, index, false)
      }
      return next
    })
  }

  const onSeek = (value: number) => {
    const audio = audioRef.current
    const next = Math.max(0, Math.min(duration || value, value))
    setCurrentTime(next)
    if (audio && Number.isFinite(audio.duration)) audio.currentTime = next
  }

  const seekBy = (delta: number) => {
    onSeek(currentTime + delta)
  }

  useEffect(() => {
    if (!musicSeekRequest) return
    seekBy(musicSeekRequest.delta)
  }, [musicSeekRequest?.id])

  const onLyricsWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (Math.abs(event.deltaY) < 4) return
    seekBy(event.deltaY > 0 ? 5 : -5)
  }

  const onEnded = () => {
    const audio = audioRef.current
    if (mode === 'repeat-one' && audio) {
      audio.currentTime = 0
      void audio.play()
      return
    }
    autoPlayAfterTrackChange.current = true
    goNext()
  }

  const onPointerDownDragHandle = (ev: ReactPointerEvent) => {
    const el = dragRef.current
    if (!el || collapsed) return
    clearCollapseTimer()
    hasUserMoved.current = true
    dragging.current = true
    pendingDragPos.current = null
    el.classList.add('music-player-dragging')
    el.style.transform = ''
    dragOffset.current = {
      x: ev.clientX - el.getBoundingClientRect().left,
      y: ev.clientY - el.getBoundingClientRect().top,
    }
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
  }

  const audio = (
    <audio
      ref={audioRef}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
      onEnded={onEnded}
    />
  )

  if (collapsed && !pinned) {
    const top = Math.max(4, Math.min(window.innerHeight - COLLAPSED_HEIGHT - 4, pos.y + 42))
    const edgeStyle =
      collapsedEdge === 'right'
        ? { left: window.innerWidth - COLLAPSED_WIDTH, top, width: COLLAPSED_WIDTH, height: COLLAPSED_HEIGHT }
        : { left: collapseBoundaryLeft, top, width: COLLAPSED_WIDTH, height: COLLAPSED_HEIGHT }

    return (
      <div
        className={[
          'music-player-panel music-player-collapsed-enter fixed z-50 overflow-hidden shadow-2xl',
          collapsedEdge === 'right' ? 'rounded-l-2xl border-r-0' : 'rounded-r-2xl border-l-0',
        ].join(' ')}
        style={edgeStyle}
      >
        {audio}
        <div className="flex h-full items-center justify-center gap-1 px-2">
          <button type="button" onClick={reveal} className="grid h-8 w-8 place-items-center rounded-lg text-[rgb(var(--fg))] opacity-80 transition hover:bg-white/10 hover:opacity-100" aria-label="展开音乐播放器" title="展开音乐播放器">
            {collapsedEdge === 'right' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
          <button type="button" onClick={() => void onTogglePlay()} className="grid h-8 w-8 place-items-center rounded-lg text-[rgb(var(--fg))] opacity-80 transition hover:bg-white/10 hover:opacity-100" aria-label="播放或暂停" title="播放或暂停">
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button type="button" onClick={goNext} className="grid h-8 w-8 place-items-center rounded-lg text-[rgb(var(--fg))] opacity-80 transition hover:bg-white/10 hover:opacity-100" aria-label="下一首" title="下一首">
            <SkipForward size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={dragRef}
      className="music-player-panel music-player-expanded-enter fixed z-50 w-[420px] rounded-2xl p-4 shadow-2xl"
      style={{ left: pos.x, top: pos.y }}
      onMouseEnter={reveal}
      onMouseLeave={scheduleCollapse}
    >
      {audio}

      <div onPointerDown={onPointerDownDragHandle} className="music-drag-handle -mx-4 -mt-4 mb-3 flex cursor-grab items-center justify-center rounded-t-2xl py-2 active:cursor-grabbing" title="拖动播放器">
        <div className="h-1 w-10 rounded-full bg-[rgb(var(--fg))] opacity-45" />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <ListMusic size={16} className="music-muted" />
        <label className="relative min-w-0 flex-1">
          <select value={playlist?.id ?? ''} onChange={(e) => setPlaylistId(e.target.value)} className="music-select w-full appearance-none rounded-xl px-3 py-2 pr-8 text-xs font-medium outline-none focus:border-[color:var(--led-color)]">
            {playlists.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.tracks.length})
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={cycleMode} className="music-icon-button" title={modeTitle(mode)} aria-label={modeTitle(mode)}>
          {modeIcon(mode)}
        </button>
        <button type="button" onClick={() => setLyricsExpanded((v) => !v)} className="music-icon-button" title="播放器内歌词" aria-label="播放器内歌词">
          <Captions size={16} />
        </button>
        <button type="button" onClick={() => setLyricsPanelEnabled(true)} className="music-icon-button" title="独立歌词窗口" aria-label="独立歌词窗口">
          <Captions size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            setPinned((v) => {
              const next = !v
              if (next) setCollapsed(false)
              return next
            })
          }}
          className="music-icon-button"
          title={pinned ? '固定模式' : '自动收起模式'}
          aria-label={pinned ? '固定模式' : '自动收起模式'}
        >
          {pinned ? <Pin size={16} /> : <PinOff size={16} />}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="music-icon-button" aria-label="关闭播放器">
          <X size={16} />
        </button>
      </div>

      <label className="relative mb-4 flex items-center gap-2">
        <Music2 size={16} className="music-muted shrink-0" />
        <select value={index} onChange={(e) => selectTrack(Number(e.target.value))} className="music-select min-w-0 flex-1 appearance-none rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[color:var(--led-color)]">
          {tracks.map((item, i) => (
            <option key={item.id} value={i}>
              {item.title} - {item.artist}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-start gap-4">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-white/10 led-ring">
          {coverUrl ? <img src={coverUrl} alt={track?.title ?? 'cover'} className="h-full w-full object-cover" /> : <Disc3 size={34} className="music-muted" />}
        </div>
        <div className="min-w-0 pt-1">
          <div className="truncate text-base font-semibold text-[rgb(var(--fg))]">{track?.title ?? '暂无歌曲'}</div>
          <div className="music-muted mt-1 truncate text-sm font-medium">{track?.artist ?? '请选择歌单'}</div>
          <div className="music-pill mt-3 inline-flex items-center rounded-full px-3 py-1 text-[11px]">
            {modeTitle(mode)} · {tracks.length} 首
          </div>
          {error ? <div className="mt-2 text-xs text-red-300">{error}</div> : null}
        </div>
      </div>

      {lyricsExpanded ? (
        <div className="mt-4 min-h-36 overflow-hidden px-4 py-3" onWheel={onLyricsWheel} title="滚轮快进/后退">
          <div className="space-y-1">
            {visibleLyrics.map((line) => {
              const active = line.absoluteIndex === currentLyricIndex
              return (
                <div
                  key={`${line.time}-${line.absoluteIndex}`}
                  className={[
                    'truncate text-center transition-all duration-300',
                    active ? 'text-base font-semibold text-[color:var(--led-color)]' : 'text-xs text-[rgb(var(--muted))]',
                  ].join(' ')}
                  style={lyricVisualStyle(line.absoluteIndex, currentLyricIndex)}
                >
                  {line.text}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || currentTime)} onChange={(e) => onSeek(Number(e.target.value))} className="music-range h-2 w-full cursor-pointer accent-[var(--led-color)]" aria-label="播放进度" />
        <div className="music-muted mt-1 flex justify-between text-[11px]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" className="music-icon-button h-10 w-10" onClick={goPrev} aria-label="上一首">
          <SkipBack size={18} />
        </button>
        <button type="button" className="btn-primary inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold disabled:opacity-50" disabled={!trackUrl} onClick={() => void onTogglePlay()} aria-label="播放或暂停">
          {playing ? <Pause size={18} /> : <Play size={18} />}
          {playing ? '暂停' : '播放'}
        </button>
        <button type="button" className="music-icon-button h-10 w-10" onClick={goNext} aria-label="下一首">
          <SkipForward size={18} />
        </button>
      </div>
    </div>
  )
}
