import { useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent as ReactTouchEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { Check, Circle, Eye, ImageOff, ImageUp, KeyRound, Languages, Palette, Save, Shield, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { listBackgroundPresets, resolveAssetUrl } from '@/api/assets'
import { uploadBackground } from '@/api/upload'
import { getApiKeyStatus, updateApiKeys } from '@/api/user/user'
import { useActiveSection } from '@/hooks/useActiveSection'
import { useAppStore, type ChatBubbleTexture, type GlassTexture, type ThemeMode } from '@/store/appStore'
import type { AssetOptionVo } from '@/types/assets'
import type { ApiKeyStatusVo, ApiKeyUpdateDto } from '@/types/user/user'

type LedConfig = {
  theme: ThemeMode
  glow: boolean
  color: string
  intensity: number
  glassOpacity: number
  glassTexture: GlassTexture
  backgroundImageUrl: string
  backgroundOpacity: number
  chatBubbleOpacity: number
  chatBubbleTexture: ChatBubbleTexture
  musicBgEnabled: boolean
  musicBgIntensity: number
  musicBgBlur: number
  musicBgSize: number
  musicBgColor: string
  lyricsPanelEnabled: boolean
  lyricsPanelOpacity: number
  lyricsFontSize: number
  lyricsFollow: boolean
  lyricsLineCount: number
  lyricsBlur: number
}

type PickerOption<T extends string> = {
  value: T
  label: string
  note: string
}

function safeParse(raw: string | null, fallback: LedConfig): LedConfig {
  if (!raw) return fallback
  try {
    const o = JSON.parse(raw) as Partial<LedConfig>
    return {
      theme: o.theme === 'light' ? 'light' : 'dark',
      glow: typeof o.glow === 'boolean' ? o.glow : fallback.glow,
      color: typeof o.color === 'string' ? o.color : fallback.color,
      intensity: typeof o.intensity === 'number' ? o.intensity : fallback.intensity,
      glassOpacity: typeof o.glassOpacity === 'number' ? o.glassOpacity : fallback.glassOpacity,
      glassTexture:
        o.glassTexture === 'clear' || o.glassTexture === 'dense' || o.glassTexture === 'frosted'
          ? o.glassTexture
          : fallback.glassTexture,
      backgroundImageUrl: typeof o.backgroundImageUrl === 'string' ? o.backgroundImageUrl : fallback.backgroundImageUrl,
      backgroundOpacity: typeof o.backgroundOpacity === 'number' ? o.backgroundOpacity : fallback.backgroundOpacity,
      chatBubbleOpacity: typeof o.chatBubbleOpacity === 'number' ? o.chatBubbleOpacity : fallback.chatBubbleOpacity,
      chatBubbleTexture:
        o.chatBubbleTexture === 'clear' || o.chatBubbleTexture === 'dense' || o.chatBubbleTexture === 'frosted'
          ? o.chatBubbleTexture
          : fallback.chatBubbleTexture,
      musicBgEnabled: typeof o.musicBgEnabled === 'boolean' ? o.musicBgEnabled : fallback.musicBgEnabled,
      musicBgIntensity: typeof o.musicBgIntensity === 'number' ? o.musicBgIntensity : fallback.musicBgIntensity,
      musicBgBlur: typeof o.musicBgBlur === 'number' ? o.musicBgBlur : fallback.musicBgBlur,
      musicBgSize: typeof o.musicBgSize === 'number' ? o.musicBgSize : fallback.musicBgSize,
      musicBgColor: typeof o.musicBgColor === 'string' ? o.musicBgColor : fallback.musicBgColor,
      lyricsPanelEnabled: typeof o.lyricsPanelEnabled === 'boolean' ? o.lyricsPanelEnabled : fallback.lyricsPanelEnabled,
      lyricsPanelOpacity: typeof o.lyricsPanelOpacity === 'number' ? o.lyricsPanelOpacity : fallback.lyricsPanelOpacity,
      lyricsFontSize: typeof o.lyricsFontSize === 'number' ? o.lyricsFontSize : fallback.lyricsFontSize,
      lyricsFollow: typeof o.lyricsFollow === 'boolean' ? o.lyricsFollow : fallback.lyricsFollow,
      lyricsLineCount: typeof o.lyricsLineCount === 'number' ? o.lyricsLineCount : fallback.lyricsLineCount,
      lyricsBlur: typeof o.lyricsBlur === 'number' ? o.lyricsBlur : fallback.lyricsBlur,
    }
  } catch {
    return fallback
  }
}

function WheelPicker<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: PickerOption<T>[]
  onChange: (value: T) => void
}) {
  const wheelRef = useRef<HTMLDivElement | null>(null)
  const moveRef = useRef<(direction: 1 | -1) => void>(() => undefined)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const rowHeight = 38
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value))

  moveRef.current = (direction: 1 | -1) => {
    const next = (activeIndex + direction + options.length) % options.length
    onChange(options[next].value)
  }

  useEffect(() => {
    const el = wheelRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      moveRef.current(event.deltaY > 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const onTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    touchStartRef.current = null
    if (!start || !touch) return
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaY) < 28 || Math.abs(deltaY) < Math.abs(deltaX)) return
    moveRef.current(deltaY < 0 ? 1 : -1)
  }

  return (
    <div
      ref={wheelRef}
      tabIndex={0}
      className="relative h-32 touch-none overflow-hidden rounded-md border border-[var(--glass-border)] bg-white/[0.03] outline-none transition focus:border-[color:var(--led-color)]"
      onTouchStart={onTouchStart}
      onTouchMove={(event) => event.preventDefault()}
      onTouchEnd={onTouchEnd}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') moveRef.current(1)
        if (e.key === 'ArrowUp') moveRef.current(-1)
      }}
    >
      <div className="pointer-events-none absolute inset-x-2 top-1/2 h-10 -translate-y-1/2 rounded-md border border-[color:var(--led-color)] bg-white/10 shadow-[0_0_18px_color-mix(in_srgb,var(--led-color)_24%,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[rgb(var(--bg))] to-transparent opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[rgb(var(--bg))] to-transparent opacity-70" />

      <div className="absolute left-2 right-2 top-1/2">
        {options.map((option, index) => {
          const offset = index - activeIndex
          const active = option.value === value
          const distance = Math.abs(offset)
          const opacity = Math.max(0.2, 1 - distance * 0.28)

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={[
                'absolute left-0 right-0 h-10 rounded-md px-3 text-left transition-all duration-300 ease-out',
                active ? 'text-[rgb(var(--fg))]' : 'text-[rgb(var(--fg))]/60 hover:text-[rgb(var(--fg))]/80',
              ].join(' ')}
              style={{
                transform: `translateY(calc(-50% + ${offset * rowHeight}px)) scale(${active ? 1 : 0.94})`,
                opacity,
                zIndex: 20 - distance,
              }}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {active ? <Check size={14} className="text-[color:var(--led-color)]" /> : <Circle size={8} />}
                {option.label}
              </div>
              <div className="ml-6 truncate text-[11px] text-[rgb(var(--muted))]">{option.note}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BackgroundPresetWheel({
  value,
  options,
  version,
  onChange,
}: {
  value: string
  options: AssetOptionVo[]
  version: number
  onChange: (value: string) => void
}) {
  const wheelRef = useRef<HTMLDivElement | null>(null)
  const moveRef = useRef<(direction: 1 | -1) => void>(() => undefined)
  const wheelLockRef = useRef(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const foundIndex = options.findIndex((o) => o.url === value)
  const activeIndex = Math.max(0, foundIndex)
  const itemWidth = 176

  moveRef.current = (direction: 1 | -1) => {
    if (!options.length) return
    const next = foundIndex < 0 ? (direction > 0 ? 0 : options.length - 1) : (activeIndex + direction + options.length) % options.length
    onChange(options[next].url)
  }

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const now = Date.now()
    if (now - wheelLockRef.current < 180) return
    wheelLockRef.current = now
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (delta !== 0) moveRef.current(delta > 0 ? 1 : -1)
  }

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    touchStartRef.current = null
    if (!start || !touch) return
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY
    if (Math.abs(delta) < 32) return
    moveRef.current(delta < 0 ? 1 : -1)
  }

  if (!options.length) {
    return <div className="rounded-md border border-[var(--glass-border)] px-3 py-3 text-sm text-[rgb(var(--muted))]">No preset backgrounds found.</div>
  }

  return (
    <div
      ref={wheelRef}
      tabIndex={0}
      className="relative h-40 touch-none overscroll-contain overflow-hidden rounded-md border border-[var(--glass-border)] bg-white/[0.03] outline-none transition focus:border-[color:var(--led-color)]"
      onWheelCapture={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={(event) => event.preventDefault()}
      onTouchEnd={handleTouchEnd}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') moveRef.current(1)
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') moveRef.current(-1)
      }}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-32 w-44 -translate-x-1/2 -translate-y-1/2 rounded-md border border-[color:var(--led-color)] shadow-[0_0_18px_color-mix(in_srgb,var(--led-color)_24%,transparent)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-14 bg-gradient-to-r from-[rgb(var(--bg))] to-transparent opacity-75" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-14 bg-gradient-to-l from-[rgb(var(--bg))] to-transparent opacity-75" />
      <div className="absolute left-1/2 top-1/2">
        {options.map((option, index) => {
          const offset = index - activeIndex
          const distance = Math.abs(offset)
          const active = option.url === value
          const opacity = Math.max(0.18, 1 - distance * 0.28)
          return (
            <button
              key={option.url}
              type="button"
              onClick={() => onChange(option.url)}
              className="absolute w-40 overflow-hidden rounded-md border border-[var(--glass-border)] bg-black/20 text-left shadow-lg transition-all duration-300 ease-out"
              style={{
                transform: `translate(calc(-50% + ${offset * itemWidth}px), -50%) scale(${active ? 1 : 0.9})`,
                opacity,
                zIndex: 30 - distance,
              }}
            >
              <img src={resolveAssetUrl(option.url, version)} alt={option.name} className="h-24 w-full object-cover" />
              <div className="flex items-center gap-2 px-2 py-2 text-xs text-[rgb(var(--fg))]">
                {active ? <Check size={13} className="text-[color:var(--led-color)]" /> : <Circle size={7} className="text-[rgb(var(--muted))]" />}
                <span className="truncate">{option.name}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Section({ id, icon, title, description, children }: { id: string; icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} className="glass scroll-mt-8 rounded-md">
      <div className="flex items-start gap-3 border-b border-[var(--glass-border)] px-4 py-3">
        <div className="mt-0.5 text-[rgb(var(--muted))]">{icon}</div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">{description}</p>
        </div>
      </div>
      <div className="divide-y divide-white/10">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">{hint}</div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { i18n } = useTranslation()

  const user = useAppStore((s) => s.user)
  const theme = useAppStore((s) => s.theme)
  const ledColor = useAppStore((s) => s.ledColor)
  const ledGlow = useAppStore((s) => s.ledGlow)
  const ledIntensity = useAppStore((s) => s.ledIntensity)
  const glassOpacity = useAppStore((s) => s.glassOpacity)
  const glassTexture = useAppStore((s) => s.glassTexture)
  const backgroundImageUrl = useAppStore((s) => s.backgroundImageUrl)
  const backgroundOpacity = useAppStore((s) => s.backgroundOpacity)
  const chatBubbleOpacity = useAppStore((s) => s.chatBubbleOpacity)
  const chatBubbleTexture = useAppStore((s) => s.chatBubbleTexture)
  const musicBgEnabled = useAppStore((s) => s.musicBgEnabled)
  const musicBgIntensity = useAppStore((s) => s.musicBgIntensity)
  const musicBgBlur = useAppStore((s) => s.musicBgBlur)
  const musicBgSize = useAppStore((s) => s.musicBgSize)
  const musicBgColor = useAppStore((s) => s.musicBgColor)
  const lyricsPanelEnabled = useAppStore((s) => s.lyricsPanelEnabled)
  const lyricsPanelOpacity = useAppStore((s) => s.lyricsPanelOpacity)
  const lyricsFontSize = useAppStore((s) => s.lyricsFontSize)
  const lyricsFollow = useAppStore((s) => s.lyricsFollow)
  const lyricsLineCount = useAppStore((s) => s.lyricsLineCount)
  const lyricsBlur = useAppStore((s) => s.lyricsBlur)
  const ledConfigRaw = useAppStore((s) => s.ledConfigRaw)
  const assetVersion = useAppStore((s) => s.assetVersion)

  const setTheme = useAppStore((s) => s.setTheme)
  const setLedColor = useAppStore((s) => s.setLedColor)
  const setLedGlow = useAppStore((s) => s.setLedGlow)
  const setLedIntensity = useAppStore((s) => s.setLedIntensity)
  const setGlassOpacity = useAppStore((s) => s.setGlassOpacity)
  const setGlassTexture = useAppStore((s) => s.setGlassTexture)
  const setBackgroundImageUrl = useAppStore((s) => s.setBackgroundImageUrl)
  const setBackgroundOpacity = useAppStore((s) => s.setBackgroundOpacity)
  const setChatBubbleOpacity = useAppStore((s) => s.setChatBubbleOpacity)
  const setChatBubbleTexture = useAppStore((s) => s.setChatBubbleTexture)
  const setMusicBgEnabled = useAppStore((s) => s.setMusicBgEnabled)
  const setMusicBgIntensity = useAppStore((s) => s.setMusicBgIntensity)
  const setMusicBgBlur = useAppStore((s) => s.setMusicBgBlur)
  const setMusicBgSize = useAppStore((s) => s.setMusicBgSize)
  const setMusicBgColor = useAppStore((s) => s.setMusicBgColor)
  const setLyricsPanelEnabled = useAppStore((s) => s.setLyricsPanelEnabled)
  const setLyricsPanelOpacity = useAppStore((s) => s.setLyricsPanelOpacity)
  const setLyricsFontSize = useAppStore((s) => s.setLyricsFontSize)
  const setLyricsFollow = useAppStore((s) => s.setLyricsFollow)
  const setLyricsLineCount = useAppStore((s) => s.setLyricsLineCount)
  const setLyricsBlur = useAppStore((s) => s.setLyricsBlur)
  const bumpAssetVersion = useAppStore((s) => s.bumpAssetVersion)
  const saveLedConfigToServer = useAppStore((s) => s.saveLedConfigToServer)

  const canSave = user.isLoggedIn
  const isAdmin = user.role === 'ADMIN'
  const canSeeDeveloper = user.role === 'ADMIN' || user.role === 'HR'
  const zh = i18n.language !== 'en-US'
  const backgroundSrc = resolveAssetUrl(backgroundImageUrl, assetVersion)

  const fallback: LedConfig = useMemo(
    () => ({
      theme,
      glow: ledGlow,
      color: ledColor,
      intensity: ledIntensity,
      glassOpacity,
      glassTexture,
      backgroundImageUrl,
      backgroundOpacity,
      chatBubbleOpacity,
      chatBubbleTexture,
      musicBgEnabled,
      musicBgIntensity,
      musicBgBlur,
      musicBgSize,
      musicBgColor,
      lyricsPanelEnabled,
      lyricsPanelOpacity,
      lyricsFontSize,
      lyricsFollow,
      lyricsLineCount,
      lyricsBlur,
    }),
    [theme, ledGlow, ledColor, ledIntensity, glassOpacity, glassTexture, backgroundImageUrl, backgroundOpacity, chatBubbleOpacity, chatBubbleTexture, musicBgEnabled, musicBgIntensity, musicBgBlur, musicBgSize, musicBgColor, lyricsPanelEnabled, lyricsPanelOpacity, lyricsFontSize, lyricsFollow, lyricsLineCount, lyricsBlur],
  )

  const parsed = useMemo(() => safeParse(ledConfigRaw, fallback), [ledConfigRaw, fallback])
  const [glow, setGlow] = useState(parsed.glow)
  const [intensity, setIntensity] = useState(parsed.intensity)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<ApiKeyStatusVo | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [chatbotApiKey, setChatbotApiKey] = useState('')
  const [apiSaving, setApiSaving] = useState(false)
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [backgroundPresets, setBackgroundPresets] = useState<AssetOptionVo[]>([])

  useEffect(() => {
    setGlow(parsed.glow)
    setIntensity(parsed.intensity)
    setLedGlow(parsed.glow)
    setLedIntensity(parsed.intensity)
  }, [parsed.glow, parsed.intensity, setLedGlow, setLedIntensity])

  useEffect(() => {
    let cancelled = false
    void listBackgroundPresets()
      .then((res) => {
        if (!cancelled) setBackgroundPresets(res.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setBackgroundPresets([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user.isLoggedIn) {
      setApiStatus(null)
      return
    }
    let cancelled = false
    void getApiKeyStatus()
      .then((res) => {
        if (!cancelled) setApiStatus(res.data)
      })
      .catch((e) => {
        if (!cancelled) setApiMessage(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [user.isLoggedIn, user.role])

  const copy = {
    title: zh ? '设置' : 'Settings',
    subtitle: zh ? '账号、界面、背景和聊天配置' : 'Account, appearance, background, and chat preferences',
    saved: zh ? '已保存' : 'Saved',
    save: zh ? '保存设置' : 'Save settings',
    saving: zh ? '保存中...' : 'Saving...',
    needLogin: zh ? '登录后可以同步到数据库' : 'Sign in to sync settings to the database',
    appearance: zh ? '外观' : 'Appearance',
    appearanceHint: zh ? '控制站点语言、主题和灯光偏好。' : 'Control language, theme, and lighting.',
    glass: zh ? '透明质感' : 'Glass surface',
    glassHint: zh ? '调整玻璃面板的透明度和质感，并同步到用户配置。' : 'Tune glass opacity and texture, then sync it.',
    background: zh ? '全局背景' : 'Global background',
    backgroundHint: zh ? '上传一张半透明背景图，并单独控制背景透明度。' : 'Upload a translucent background image and control its opacity.',
    chat: zh ? '聊天页面' : 'Chat page',
    chatHint: zh ? '调整聊天气泡的透明度和玻璃质感。' : 'Tune chat bubble opacity and texture.',
    api: zh ? '聊天 API' : 'Chat API',
      apiHint: zh ? 'API Key 会加密保存到数据库，并自动适配 OpenAI 与 DeepSeek。页面不会回显明文。' : 'API keys are encrypted at rest and automatically routed to OpenAI or DeepSeek.',
    developer: zh ? '开发字段' : 'Developer fields',
    developerHint: zh ? '仅 ADMIN 可见，普通用户不会看到这些内部字段。' : 'Visible only to ADMIN users.',
  }

  const languageOptions: PickerOption<string>[] = [
    { value: 'zh-CN', label: '中文', note: '简体中文界面' },
    { value: 'en-US', label: 'English', note: 'English interface' },
  ]

  const themeOptions: PickerOption<ThemeMode>[] = [
    { value: 'dark', label: zh ? '深色' : 'Dark', note: zh ? '适合夜间和沉浸阅读' : 'For night and focused reading' },
    { value: 'light', label: zh ? '浅色' : 'Light', note: zh ? '适合明亮环境浏览' : 'For bright environments' },
  ]

  const textureOptions: PickerOption<GlassTexture>[] = [
    { value: 'frosted', label: zh ? '磨砂' : 'Frosted', note: zh ? '均衡的模糊和透明度' : 'Balanced blur and transparency' },
    { value: 'clear', label: zh ? '清透' : 'Clear', note: zh ? '更轻的模糊，更接近透明玻璃' : 'Lighter blur with clearer surfaces' },
    { value: 'dense', label: zh ? '厚玻璃' : 'Dense', note: zh ? '更强的模糊和层次感' : 'Stronger blur and depth' },
  ]

  const buildRaw = (overrides: Partial<LedConfig> = {}) =>
    JSON.stringify({
      theme,
      glow,
      color: ledColor,
      intensity,
      glassOpacity,
      glassTexture,
      backgroundImageUrl,
      backgroundOpacity,
      chatBubbleOpacity,
      chatBubbleTexture,
      musicBgEnabled,
      musicBgIntensity,
      musicBgBlur,
      musicBgSize,
      musicBgColor,
      lyricsPanelEnabled,
      lyricsPanelOpacity,
      lyricsFontSize,
      lyricsFollow,
      lyricsLineCount,
      lyricsBlur,
      ...overrides,
    })

  const onSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setOk(null)
      await saveLedConfigToServer(buildRaw())
      setOk(copy.saved)
      setTimeout(() => setOk(null), 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const onBackgroundFile = async (file?: File) => {
    if (!file) return
    try {
      setSaving(true)
      setError(null)
      const res = await uploadBackground(file)
      if (res.data) {
        setBackgroundImageUrl(res.data)
        bumpAssetVersion()
        if (canSave) {
          await saveLedConfigToServer(buildRaw({ backgroundImageUrl: res.data }))
          bumpAssetVersion()
          setOk(copy.saved)
          setTimeout(() => setOk(null), 1200)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const onSelectBackgroundPreset = async (url: string) => {
    try {
      setSaving(true)
      setError(null)
      setBackgroundImageUrl(url)
      bumpAssetVersion()
      if (canSave) {
        await saveLedConfigToServer(buildRaw({ backgroundImageUrl: url }))
        setOk(copy.saved)
        setTimeout(() => setOk(null), 1200)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const onClearBackground = async () => {
    try {
      setSaving(true)
      setError(null)
      setBackgroundImageUrl('')
      bumpAssetVersion()
      if (canSave) {
        await saveLedConfigToServer(buildRaw({ backgroundImageUrl: '' }))
        setOk(copy.saved)
        setTimeout(() => setOk(null), 1200)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const onSaveApiKeys = async () => {
    const payload: ApiKeyUpdateDto = {}
    if (apiKey.trim()) payload.apiKey = apiKey.trim()
    if (isAdmin && chatbotApiKey.trim()) payload.chatbotApiKey = chatbotApiKey.trim()
    if (!Object.keys(payload).length) {
      setApiMessage(zh ? '没有输入新的 API Key' : 'No new API key entered')
      return
    }

    try {
      setApiSaving(true)
      setApiMessage(null)
      await updateApiKeys(payload)
      setApiKey('')
      setChatbotApiKey('')
      const status = await getApiKeyStatus()
      setApiStatus(status.data)
      setApiMessage(zh ? 'API Key 已加密保存' : 'API key encrypted and saved')
    } catch (e) {
      setApiMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setApiSaving(false)
    }
  }

  const navItems = [
    { id: 'appearance', label: copy.appearance, icon: <Palette size={16} /> },
    { id: 'glass', label: copy.glass, icon: <Eye size={16} /> },
    { id: 'background', label: copy.background, icon: <ImageUp size={16} /> },
    { id: 'chat', label: copy.chat, icon: <Sparkles size={16} /> },
    { id: 'music-visual', label: '音乐视觉', icon: <Sparkles size={16} /> },
    { id: 'lyrics-window', label: '歌词窗口', icon: <Eye size={16} /> },
    { id: 'api', label: copy.api, icon: <KeyRound size={16} /> },
    ...(canSeeDeveloper ? [{ id: 'developer', label: copy.developer, icon: <Shield size={16} /> }] : []),
  ]
  const activeSection = useActiveSection(navItems.map((item) => item.id))

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 border-b border-[var(--glass-border)] pb-4">
        <h1 className="text-2xl font-semibold">{copy.title}</h1>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">{copy.subtitle}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-8 md:self-start">
          <nav className="space-y-1 text-sm">
            {navItems.map((item) => {
              const active = activeSection === item.id
              return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={[
                  'flex items-center gap-2 border-l-2 px-3 py-2 transition',
                  active
                    ? 'border-[color:var(--led-color)] bg-white/[0.04] text-[rgb(var(--fg))]'
                    : 'border-transparent text-[rgb(var(--muted))] hover:border-white/20 hover:bg-white/[0.03] hover:text-[rgb(var(--fg))]',
                ].join(' ')}
              >
                {item.icon}
                {item.label}
              </a>
              )
            })}
          </nav>
        </aside>

        <div className="space-y-5">
          <Section id="appearance" icon={<Palette size={18} />} title={copy.appearance} description={copy.appearanceHint}>
            <Row label={zh ? '语言' : 'Language'} hint={zh ? '更改页面显示语言。' : 'Change Display Language.'}>
              <div className="flex items-center gap-3">
                <Languages size={18} className="hidden text-[rgb(var(--muted))] md:block" />
                <div className="min-w-0 flex-1">
                  <WheelPicker value={i18n.language} options={languageOptions} onChange={(value) => void i18n.changeLanguage(value)} />
                </div>
              </div>
            </Row>

            <Row label={zh ? '主题' : 'Theme'} hint={zh ? '浅色和深色模式会同步调整页面文字颜色。' : 'Light and dark mode update text colors.'}>
              <WheelPicker value={theme} options={themeOptions} onChange={setTheme} />
            </Row>

            <Row label={zh ? '颜色' : 'Color'} hint={zh ? '站点强调色和主要按钮颜色。' : 'Accent color and primary actions.'}>
              <div className="flex items-center gap-3">
                <input type="color" value={ledColor} onChange={(e) => setLedColor(e.target.value)} className="h-10 w-16 rounded-md border border-[var(--glass-border)] bg-transparent p-1" />
                <code className="rounded-md border border-[var(--glass-border)] px-2 py-1 text-xs text-[rgb(var(--muted))]">{ledColor}</code>
              </div>
            </Row>

            <Row label={zh ? '光晕' : 'Glow'} hint={zh ? '控制强调色是否有发光边缘。' : 'Controls whether accent edges glow.'}>
              <button
                type="button"
                onClick={() => {
                  const next = !glow
                  setGlow(next)
                  setLedGlow(next)
                }}
                className={[
                  'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
                  glow ? 'border-[color:var(--led-color)] bg-[color:var(--led-color)]/15 text-[color:var(--led-color)]' : 'border-[var(--glass-border)] bg-white/5 text-[rgb(var(--muted))]',
                ].join(' ')}
              >
                <Sparkles size={16} />
                {glow ? (zh ? '已开启' : 'Enabled') : zh ? '已关闭' : 'Disabled'}
              </button>
            </Row>

            <Row label={zh ? '强度' : 'Intensity'} hint={zh ? '保存到配置中，供后续更细的灯光效果使用。' : 'Saved for richer lighting effects later.'}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={intensity}
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    setIntensity(next)
                    setLedIntensity(next)
                  }}
                  className="min-w-0 flex-1 accent-[var(--led-color)]"
                />
                <span className="w-12 text-right text-xs text-[color:var(--led-color)]">{Math.round(intensity * 100)}%</span>
              </div>
            </Row>
          </Section>

          <Section id="glass" icon={<Eye size={18} />} title={copy.glass} description={copy.glassHint}>
            <Row label={zh ? '透明度' : 'Opacity'} hint={zh ? '数值越高，玻璃面板越不透明。' : 'Higher values make glass panels less transparent.'}>
              <div className="flex items-center gap-3">
                <input type="range" min={0.05} max={0.92} step={0.01} value={glassOpacity} onChange={(e) => setGlassOpacity(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--led-color)]" />
                <span className="w-12 text-right text-xs text-[rgb(var(--muted))]">{Math.round(glassOpacity * 100)}%</span>
              </div>
            </Row>

            <Row label={zh ? '质感' : 'Texture'} hint={zh ? '选择不同模糊和层次的玻璃质感。' : 'Choose blur and depth styles.'}>
              <WheelPicker value={glassTexture} options={textureOptions} onChange={setGlassTexture} />
            </Row>
          </Section>

          <Section id="background" icon={<ImageUp size={18} />} title={copy.background} description={copy.backgroundHint}>
            <Row label={zh ? '背景图片' : 'Image'} hint={zh ? '选择网站背景或上传自己的背景，配置会写入数据库。' : 'Choose a website background or upload your own image.'}>
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (backgroundImageUrl) void onClearBackground()
                  }}
                  className={[
                    'inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
                    backgroundImageUrl ? 'border-[var(--glass-border)] bg-white/5 text-[rgb(var(--fg))]' : 'border-[color:var(--led-color)] bg-[color:var(--led-color)]/15 text-[color:var(--led-color)]',
                  ].join(' ')}
                  aria-pressed={!backgroundImageUrl}
                >
                  <ImageOff size={16} />
                  {backgroundImageUrl ? (zh ? '关闭背景图片' : 'Disable background image') : zh ? '已关闭背景图片' : 'Background image disabled'}
                </button>
                <BackgroundPresetWheel value={backgroundImageUrl} options={backgroundPresets} version={assetVersion} onChange={(url) => void onSelectBackgroundPreset(url)} />
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <label className="glass inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm text-[rgb(var(--fg))]">
                    <ImageUp size={16} />
                    {zh ? '上传背景' : 'Upload background'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => void onBackgroundFile(e.target.files?.[0])} />
                  </label>
                  {backgroundSrc ? <img src={backgroundSrc} alt="background preview" className="h-20 w-36 rounded-md object-cover" /> : null}
                  {isAdmin && backgroundImageUrl ? <code className="break-all text-xs text-[rgb(var(--muted))]">{backgroundImageUrl}</code> : null}
                </div>
              </div>
            </Row>

            <Row label={zh ? '背景透明度' : 'Background opacity'} hint={zh ? '只影响全局背景图，不影响玻璃面板透明度。' : 'Affects only the global background image.'}>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={0.95} step={0.01} value={backgroundOpacity} onChange={(e) => setBackgroundOpacity(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--led-color)]" />
                <span className="w-12 text-right text-xs text-[rgb(var(--muted))]">{Math.round(backgroundOpacity * 100)}%</span>
              </div>
            </Row>
          </Section>

          <Section id="chat" icon={<Sparkles size={18} />} title={copy.chat} description={copy.chatHint}>
            <Row label={zh ? '气泡透明度' : 'Bubble opacity'} hint={zh ? '只影响聊天消息气泡，不影响全站玻璃面板。' : 'Only affects message bubbles.'}>
              <div className="flex items-center gap-3">
                <input type="range" min={0.18} max={0.92} step={0.01} value={chatBubbleOpacity} onChange={(e) => setChatBubbleOpacity(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--led-color)]" />
                <span className="w-12 text-right text-xs text-[rgb(var(--muted))]">{Math.round(chatBubbleOpacity * 100)}%</span>
              </div>
            </Row>

            <Row label={zh ? '气泡质感' : 'Bubble texture'} hint={zh ? '选择聊天气泡的模糊和层次。' : 'Choose chat bubble blur and depth.'}>
              <WheelPicker value={chatBubbleTexture} options={textureOptions} onChange={setChatBubbleTexture} />
            </Row>

            <Row label={zh ? '预览' : 'Preview'} hint={zh ? '保存后聊天页会使用这个效果。' : 'The chat page will use this style after saving.'}>
              <div className="flex">
                <div className="chat-bubble rounded-2xl px-4 py-3 text-sm text-[rgb(var(--fg))]">
                  {zh ? '这是一条很小的预览消息。' : 'A tiny preview message.'}
                </div>
              </div>
            </Row>
          </Section>

          <Section id="music-visual" icon={<Sparkles size={18} />} title="音乐动态背景" description="控制页面底部跳跃线条的光晕、强度和颜色。">
            <Row label="开关" hint="开启后会在全站背景上显示动态音乐线条。">
              <button
                type="button"
                onClick={() => setMusicBgEnabled(!musicBgEnabled)}
                className={[
                  'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
                  musicBgEnabled ? 'border-[color:var(--led-color)] bg-[color:var(--led-color)]/15 text-[color:var(--led-color)]' : 'border-[var(--glass-border)] bg-white/5 text-[rgb(var(--muted))]',
                ].join(' ')}
              >
                <Sparkles size={16} />
                {musicBgEnabled ? '已开启' : '已关闭'}
              </button>
            </Row>

            <Row label="强弱" hint="数值越高，线条跳跃和光晕越明显。">
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={1} step={0.01} value={musicBgIntensity} onChange={(e) => setMusicBgIntensity(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--led-color)]" />
                <span className="w-12 text-right text-xs text-[rgb(var(--muted))]">{Math.round(musicBgIntensity * 100)}%</span>
              </div>
            </Row>

            <Row label="模糊" hint="让线条更柔和，适合当作背景氛围。">
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={12} step={0.25} value={musicBgBlur} onChange={(e) => setMusicBgBlur(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--led-color)]" />
                <span className="w-12 text-right text-xs text-[rgb(var(--muted))]">{musicBgBlur.toFixed(2).replace(/\.00$/, '')}px</span>
              </div>
            </Row>

            <Row label="宽度" hint="主要控制动态线条的横向铺展范围，避免在竖向上压满屏幕。">
              <div className="flex items-center gap-3">
                <input type="range" min={0.35} max={1.6} step={0.01} value={musicBgSize} onChange={(e) => setMusicBgSize(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--led-color)]" />
                <span className="w-12 text-right text-xs text-[rgb(var(--muted))]">{Math.round(musicBgSize * 100)}%</span>
              </div>
            </Row>

            <Row label="颜色" hint="可以使用独立颜色，也可以手动调成与主题强调色一致。">
              <div className="flex items-center gap-3">
                <input type="color" value={musicBgColor} onChange={(e) => setMusicBgColor(e.target.value)} className="h-10 w-16 rounded-md border border-[var(--glass-border)] bg-transparent p-1" />
                <button type="button" onClick={() => setMusicBgColor(ledColor)} className="btn-ghost rounded-md px-3 py-2 text-xs">
                  使用主题色
                </button>
                <code className="rounded-md border border-[var(--glass-border)] px-2 py-1 text-xs text-[rgb(var(--muted))]">{musicBgColor}</code>
              </div>
            </Row>
          </Section>

          <Section id="lyrics-window" icon={<Eye size={18} />} title="独立歌词窗口" description="控制全局独立歌词窗口的显示方式。">
            <Row label="开关" hint="开启后会显示一个可拖拽的独立歌词窗口，也可以在音乐播放器中开关。">
              <button
                type="button"
                onClick={() => setLyricsPanelEnabled(!lyricsPanelEnabled)}
                className={[
                  'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
                  lyricsPanelEnabled ? 'border-[color:var(--led-color)] bg-[color:var(--led-color)]/15 text-[color:var(--led-color)]' : 'border-[var(--glass-border)] bg-white/5 text-[rgb(var(--muted))]',
                ].join(' ')}
              >
                <Eye size={16} />
                {lyricsPanelEnabled ? '已开启' : '已关闭'}
              </button>
            </Row>

            <Row label="透明度" hint="设为 0 时窗口几乎完全透明，只保留歌词文字。">
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={0.92} step={0.01} value={lyricsPanelOpacity} onChange={(e) => setLyricsPanelOpacity(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--led-color)]" />
                <span className="w-12 text-right text-xs text-[rgb(var(--muted))]">{Math.round(lyricsPanelOpacity * 100)}%</span>
              </div>
            </Row>

            <Row label="字体" hint="调整歌词主行字体大小。">
              <div className="flex items-center gap-3">
                <input type="range" min={14} max={42} step={1} value={lyricsFontSize} onChange={(e) => setLyricsFontSize(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--led-color)]" />
                <span className="w-12 text-right text-xs text-[rgb(var(--muted))]">{lyricsFontSize}px</span>
              </div>
            </Row>

            <Row label="跟读" hint="开启后当前歌词行会高亮，适合跟唱或跟读。">
              <button
                type="button"
                onClick={() => setLyricsFollow(!lyricsFollow)}
                className={[
                  'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
                  lyricsFollow ? 'border-[color:var(--led-color)] bg-[color:var(--led-color)]/15 text-[color:var(--led-color)]' : 'border-[var(--glass-border)] bg-white/5 text-[rgb(var(--muted))]',
                ].join(' ')}
              >
                {lyricsFollow ? '已开启' : '已关闭'}
              </button>
            </Row>

            <Row label="展示行数" hint="控制独立窗口中同时显示的歌词行数。">
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={9} step={1} value={lyricsLineCount} onChange={(e) => setLyricsLineCount(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--led-color)]" />
                <span className="w-12 text-right text-xs text-[rgb(var(--muted))]">{lyricsLineCount}</span>
              </div>
            </Row>

            <Row label="模糊" hint="调整歌词窗口磨砂玻璃模糊程度。">
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={32} step={1} value={lyricsBlur} onChange={(e) => setLyricsBlur(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--led-color)]" />
                <span className="w-12 text-right text-xs text-[rgb(var(--muted))]">{lyricsBlur}px</span>
              </div>
            </Row>
          </Section>

            <Section id="api" icon={<KeyRound size={18} />} title={copy.api} description={copy.apiHint}>
              <Row label={zh ? '我的 API Key' : 'My API key'} hint={apiStatus?.hasApiKey ? (zh ? '已保存。OpenAI 项目密钥会自动识别；旧式 OpenAI 密钥可添加 openai: 前缀。' : 'Saved. OpenAI project keys are detected automatically; prefix legacy OpenAI keys with openai:.') : (zh ? '支持 OpenAI 和 DeepSeek；不明确的密钥默认按 DeepSeek 处理。' : 'Supports OpenAI and DeepSeek; ambiguous keys default to DeepSeek.')}>
                <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" autoComplete="off" placeholder={apiStatus?.hasApiKey ? '••••••••••••••••' : 'sk-proj-... / deepseek:sk-...'} className="input-base w-full rounded-md px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]" />
            </Row>

            {isAdmin ? (
              <>
                  <Row label={zh ? '普通用户 chatbot API Key' : 'Default user chatbot API key'} hint={apiStatus?.hasChatbotApiKey ? (zh ? '已保存。普通用户未填写自己的 key 时使用它。' : 'Saved. Used when normal users do not provide their own key.') : (zh ? '支持 OpenAI 与 DeepSeek。旧式 OpenAI 密钥请添加 openai: 前缀。' : 'Supports OpenAI and DeepSeek. Prefix legacy OpenAI keys with openai:.')}>
                    <input value={chatbotApiKey} onChange={(e) => setChatbotApiKey(e.target.value)} type="password" autoComplete="off" placeholder={apiStatus?.hasChatbotApiKey ? '••••••••••••••••' : 'sk-proj-... / deepseek:sk-...'} className="input-base w-full rounded-md px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]" />
                </Row>
              </>
            ) : null}

            <Row label={zh ? '保存密钥' : 'Save keys'} hint={zh ? '留空不会覆盖已有密钥。' : 'Empty fields will not overwrite saved keys.'}>
              <div className="flex items-center gap-3">
                <button type="button" disabled={!canSave || apiSaving} onClick={() => void onSaveApiKeys()} className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50">
                  <Save size={16} />
                  {apiSaving ? copy.saving : copy.save}
                </button>
                {apiMessage ? <span className="text-xs text-[rgb(var(--muted))]">{apiMessage}</span> : null}
              </div>
            </Row>
          </Section>

          {canSeeDeveloper ? (
            <Section id="developer" icon={<Shield size={18} />} title={copy.developer} description={copy.developerHint}>
              <Row label="UserProfileVo.ledConfig" hint={zh ? '当前将提交到数据库的 JSON 字符串。' : 'JSON payload saved to the database.'}>
                <pre className="max-h-40 overflow-auto rounded-md border border-[var(--glass-border)] bg-black/25 p-3 text-xs leading-5 text-[rgb(var(--muted))]">
                  {buildRaw()}
                </pre>
              </Row>
            </Section>
          ) : null}

          <div className="glass sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] flex flex-col items-stretch justify-between gap-3 rounded-md px-4 py-3 md:bottom-4 md:flex-row md:items-center">
            <div className="text-xs text-[rgb(var(--muted))]">
              {canSave ? (zh ? `将保存到 ${user.nickname} 的配置` : `Saving to ${user.nickname}`) : copy.needLogin}
            </div>
            <div className="flex items-center gap-3">
              {error ? <span className="text-xs text-red-300">{error}</span> : null}
              {ok ? <span className="text-xs text-emerald-300">{ok}</span> : null}
              <button type="button" disabled={!canSave || saving} onClick={onSave} className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50">
                <Save size={16} />
                {saving ? copy.saving : copy.save}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-10" />
    </div>
  )
}
