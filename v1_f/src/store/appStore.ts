import { create } from 'zustand'

import { listBackgroundPresets } from '@/api/assets'
import { getAdminConfig, getProfile, updateLedConfig, updateProfile } from '@/api/user/user'

export type ThemeMode = 'dark' | 'light'
export type GlassTexture = 'frosted' | 'clear' | 'dense'
export type ChatBubbleTexture = GlassTexture

export type MusicNowPlaying = {
  title?: string
  artist?: string
  lyricUrl?: string | null
  currentTime: number
  duration: number
  playing: boolean
}

export type MusicSeekRequest = {
  id: number
  delta: number
}

export type UserState = {
  isLoggedIn: boolean
  id?: number
  nickname: string
  uid: string
  email?: string
  avatarUrl?: string
  role?: string
  createTime?: string
  locationLatitude?: number | null
  locationLongitude?: number | null
  locationAccuracy?: number | null
  locationUpdatedAt?: string | null
}

type AppState = {
  theme: ThemeMode
  ledColor: string
  ledGlow: boolean
  ledIntensity: number
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
  musicNowPlaying: MusicNowPlaying
  musicSeekRequest: MusicSeekRequest | null
  ledConfigRaw: string | null
  assetVersion: number
  unreadMessages: Record<string, number>

  token: string | null
  user: UserState

  isMusicPlayerOpen: boolean
  isAccountPanelOpen: boolean
  isAuthPanelOpen: boolean

  setTheme: (theme: ThemeMode) => void
  setLedColor: (color: string) => void
  setLedGlow: (glow: boolean) => void
  setLedIntensity: (intensity: number) => void
  setGlassOpacity: (opacity: number) => void
  setGlassTexture: (texture: GlassTexture) => void
  setBackgroundImageUrl: (url: string) => void
  setBackgroundOpacity: (opacity: number) => void
  setChatBubbleOpacity: (opacity: number) => void
  setChatBubbleTexture: (texture: ChatBubbleTexture) => void
  setMusicBgEnabled: (enabled: boolean) => void
  setMusicBgIntensity: (intensity: number) => void
  setMusicBgBlur: (blur: number) => void
  setMusicBgSize: (size: number) => void
  setMusicBgColor: (color: string) => void
  setLyricsPanelEnabled: (enabled: boolean) => void
  setLyricsPanelOpacity: (opacity: number) => void
  setLyricsFontSize: (size: number) => void
  setLyricsFollow: (follow: boolean) => void
  setLyricsLineCount: (count: number) => void
  setLyricsBlur: (blur: number) => void
  setMusicNowPlaying: (next: Partial<MusicNowPlaying>) => void
  requestMusicSeek: (delta: number) => void
  bumpAssetVersion: () => void
  addUnreadMessage: (peerId: string) => void
  clearUnreadMessages: (peerId?: string) => void

  setToken: (token: string | null) => void

  openAuthPanel: () => void
  closeAuthPanel: () => void

  loginSuccess: (p: {
    token: string
    id?: number
    nickname: string
    uid: string
    email?: string
    avatarUrl?: string
    role?: string
    createTime?: string
  }) => void
  logout: () => void
  updateEmail: (email: string) => void
  saveProfileToServer: (p: { nickname?: string; avatar?: string }) => Promise<void>

  bootstrapAuthProfile: () => Promise<void>
  bootstrapGuestConfig: () => Promise<void>
  setLedConfigFromProfile: (raw: string | null) => void
  saveLedConfigToServer: (raw: string) => Promise<void>

  toggleMusicPlayer: () => void
  setMusicPlayerOpen: (open: boolean) => void

  toggleAccountPanel: () => void
  setAccountPanelOpen: (open: boolean) => void
}

const LS_TOKEN = 'yaozher.token'
const DEFAULT_GLASS_OPACITY = 0.42
const DEFAULT_GLASS_TEXTURE: GlassTexture = 'frosted'
const DEFAULT_BACKGROUND_OPACITY = 0.16
const DEFAULT_CHAT_BUBBLE_OPACITY = 0.5
const DEFAULT_CHAT_BUBBLE_TEXTURE: ChatBubbleTexture = 'frosted'
const DEFAULT_LED_GLOW = true
const DEFAULT_LED_INTENSITY = 0.85
const DEFAULT_MUSIC_BG_ENABLED = true
const DEFAULT_MUSIC_BG_INTENSITY = 0.52
const DEFAULT_MUSIC_BG_BLUR = 4
const DEFAULT_MUSIC_BG_SIZE = 1
const DEFAULT_LYRICS_PANEL_OPACITY = 0.36
const DEFAULT_LYRICS_FONT_SIZE = 22
const DEFAULT_LYRICS_LINE_COUNT = 5
const DEFAULT_LYRICS_BLUR = 14

const GUEST_LED_COLORS = ['#00ffcc', '#67e8f9', '#a3ff12', '#ff4fd8', '#ffd166', '#8bff9f']

const defaultUser: UserState = {
  isLoggedIn: false,
  nickname: 'Guest',
  uid: 'ID: ----',
  email: undefined,
}

function applyThemeToDom(theme: ThemeMode) {
  const root = document.documentElement
  if (theme === 'light') root.setAttribute('data-theme', 'light')
  else root.removeAttribute('data-theme')
}

function clampLedIntensity(intensity: number) {
  if (!Number.isFinite(intensity)) return DEFAULT_LED_INTENSITY
  return Math.min(1, Math.max(0, intensity))
}

function applyLedToDom(color: string, glow = DEFAULT_LED_GLOW, intensity = DEFAULT_LED_INTENSITY) {
  const root = document.documentElement
  const nextIntensity = clampLedIntensity(intensity)
  root.style.setProperty('--led-color', color)
  root.style.setProperty('--led-glow-size', `${Math.round(10 + nextIntensity * 30)}px`)
  root.style.setProperty('--led-glow-strength', `${Math.round(20 + nextIntensity * 55)}%`)
  root.setAttribute('data-led-glow', glow ? 'on' : 'off')
}

function clampGlassOpacity(opacity: number) {
  if (!Number.isFinite(opacity)) return DEFAULT_GLASS_OPACITY
  return Math.min(0.92, Math.max(0.05, opacity))
}

function clampBackgroundOpacity(opacity: number) {
  if (!Number.isFinite(opacity)) return DEFAULT_BACKGROUND_OPACITY
  return Math.min(0.95, Math.max(0, opacity))
}

function clampChatBubbleOpacity(opacity: number) {
  if (!Number.isFinite(opacity)) return DEFAULT_CHAT_BUBBLE_OPACITY
  return Math.min(0.92, Math.max(0.18, opacity))
}

function clamp01(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(1, Math.max(0, value))
}

function clampRange(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function isGlassTexture(value: unknown): value is GlassTexture {
  return value === 'frosted' || value === 'clear' || value === 'dense'
}

function applyGlassToDom(opacity: number, texture: GlassTexture) {
  const root = document.documentElement
  root.style.setProperty('--glass-opacity', String(clampGlassOpacity(opacity)))
  root.setAttribute('data-glass-texture', texture)
}

function applyChatBubbleToDom(opacity: number, texture: ChatBubbleTexture) {
  const root = document.documentElement
  root.style.setProperty('--chat-bubble-opacity', String(clampChatBubbleOpacity(opacity)))
  root.setAttribute('data-chat-bubble-texture', texture)
}

function tryParseLedConfig(raw: string | null): {
  theme?: ThemeMode
  glow?: boolean
  color?: string
  intensity?: number
  glassOpacity?: number
  glassTexture?: GlassTexture
  backgroundImageUrl?: string
  backgroundOpacity?: number
  chatBubbleOpacity?: number
  chatBubbleTexture?: ChatBubbleTexture
  musicBgEnabled?: boolean
  musicBgIntensity?: number
  musicBgBlur?: number
  musicBgSize?: number
  musicBgColor?: string
  lyricsPanelEnabled?: boolean
  lyricsPanelOpacity?: number
  lyricsFontSize?: number
  lyricsFollow?: boolean
  lyricsLineCount?: number
  lyricsBlur?: number
} {
  if (!raw) return {}
  try {
    const obj = JSON.parse(raw) as any
    return {
      theme: obj?.theme === 'light' ? 'light' : obj?.theme === 'dark' ? 'dark' : undefined,
      glow: typeof obj?.glow === 'boolean' ? obj.glow : undefined,
      color: typeof obj?.color === 'string' ? obj.color : undefined,
      intensity: typeof obj?.intensity === 'number' ? clampLedIntensity(obj.intensity) : undefined,
      glassOpacity: typeof obj?.glassOpacity === 'number' ? clampGlassOpacity(obj.glassOpacity) : undefined,
      glassTexture: isGlassTexture(obj?.glassTexture) ? obj.glassTexture : undefined,
      backgroundImageUrl: typeof obj?.backgroundImageUrl === 'string' ? obj.backgroundImageUrl : undefined,
      backgroundOpacity: typeof obj?.backgroundOpacity === 'number' ? clampBackgroundOpacity(obj.backgroundOpacity) : undefined,
      chatBubbleOpacity: typeof obj?.chatBubbleOpacity === 'number' ? clampChatBubbleOpacity(obj.chatBubbleOpacity) : undefined,
      chatBubbleTexture: isGlassTexture(obj?.chatBubbleTexture) ? obj.chatBubbleTexture : undefined,
      musicBgEnabled: typeof obj?.musicBgEnabled === 'boolean' ? obj.musicBgEnabled : undefined,
      musicBgIntensity: typeof obj?.musicBgIntensity === 'number' ? clamp01(obj.musicBgIntensity, DEFAULT_MUSIC_BG_INTENSITY) : undefined,
      musicBgBlur: typeof obj?.musicBgBlur === 'number' ? clampRange(obj.musicBgBlur, 0, 12, DEFAULT_MUSIC_BG_BLUR) : undefined,
      musicBgSize: typeof obj?.musicBgSize === 'number' ? clampRange(obj.musicBgSize, 0.35, 1.6, DEFAULT_MUSIC_BG_SIZE) : undefined,
      musicBgColor: typeof obj?.musicBgColor === 'string' ? obj.musicBgColor : undefined,
      lyricsPanelEnabled: typeof obj?.lyricsPanelEnabled === 'boolean' ? obj.lyricsPanelEnabled : undefined,
      lyricsPanelOpacity: typeof obj?.lyricsPanelOpacity === 'number' ? clamp01(obj.lyricsPanelOpacity, DEFAULT_LYRICS_PANEL_OPACITY) : undefined,
      lyricsFontSize: typeof obj?.lyricsFontSize === 'number' ? clampRange(obj.lyricsFontSize, 14, 42, DEFAULT_LYRICS_FONT_SIZE) : undefined,
      lyricsFollow: typeof obj?.lyricsFollow === 'boolean' ? obj.lyricsFollow : undefined,
      lyricsLineCount: typeof obj?.lyricsLineCount === 'number' ? Math.round(clampRange(obj.lyricsLineCount, 1, 9, DEFAULT_LYRICS_LINE_COUNT)) : undefined,
      lyricsBlur: typeof obj?.lyricsBlur === 'number' ? clampRange(obj.lyricsBlur, 0, 32, DEFAULT_LYRICS_BLUR) : undefined,
    }
  } catch {
    return {}
  }
}

function pickRandom<T>(items: T[]) {
  if (!items.length) return undefined
  return items[Math.floor(Math.random() * items.length)]
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'dark',
  ledColor: '#00ffcc',
  ledGlow: DEFAULT_LED_GLOW,
  ledIntensity: DEFAULT_LED_INTENSITY,
  glassOpacity: DEFAULT_GLASS_OPACITY,
  glassTexture: DEFAULT_GLASS_TEXTURE,
  backgroundImageUrl: '',
  backgroundOpacity: DEFAULT_BACKGROUND_OPACITY,
  chatBubbleOpacity: DEFAULT_CHAT_BUBBLE_OPACITY,
  chatBubbleTexture: DEFAULT_CHAT_BUBBLE_TEXTURE,
  musicBgEnabled: DEFAULT_MUSIC_BG_ENABLED,
  musicBgIntensity: DEFAULT_MUSIC_BG_INTENSITY,
  musicBgBlur: DEFAULT_MUSIC_BG_BLUR,
  musicBgSize: DEFAULT_MUSIC_BG_SIZE,
  musicBgColor: '#00ffcc',
  lyricsPanelEnabled: false,
  lyricsPanelOpacity: DEFAULT_LYRICS_PANEL_OPACITY,
  lyricsFontSize: DEFAULT_LYRICS_FONT_SIZE,
  lyricsFollow: true,
  lyricsLineCount: DEFAULT_LYRICS_LINE_COUNT,
  lyricsBlur: DEFAULT_LYRICS_BLUR,
  musicNowPlaying: {
    currentTime: 0,
    duration: 0,
    playing: false,
  },
  musicSeekRequest: null,
  ledConfigRaw: null,
  assetVersion: Date.now(),
  unreadMessages: {},

  token: localStorage.getItem(LS_TOKEN),
  user: {
    ...defaultUser,
    isLoggedIn: !!localStorage.getItem(LS_TOKEN),
  },

  isMusicPlayerOpen: false,
  isAccountPanelOpen: false,
  isAuthPanelOpen: false,

  setTheme: (theme) => {
    applyThemeToDom(theme)
    set({ theme })
  },

  setLedColor: (color) => {
    applyLedToDom(color, get().ledGlow, get().ledIntensity)
    set({ ledColor: color })
  },

  setLedGlow: (glow) => {
    applyLedToDom(get().ledColor, glow, get().ledIntensity)
    set({ ledGlow: glow })
  },

  setLedIntensity: (intensity) => {
    const next = clampLedIntensity(intensity)
    applyLedToDom(get().ledColor, get().ledGlow, next)
    set({ ledIntensity: next })
  },

  setGlassOpacity: (opacity) => {
    const next = clampGlassOpacity(opacity)
    applyGlassToDom(next, get().glassTexture)
    set({ glassOpacity: next })
  },

  setGlassTexture: (texture) => {
    applyGlassToDom(get().glassOpacity, texture)
    set({ glassTexture: texture })
  },

  setBackgroundImageUrl: (url) => set({ backgroundImageUrl: url }),

  setBackgroundOpacity: (opacity) => set({ backgroundOpacity: clampBackgroundOpacity(opacity) }),

  setChatBubbleOpacity: (opacity) => {
    const next = clampChatBubbleOpacity(opacity)
    applyChatBubbleToDom(next, get().chatBubbleTexture)
    set({ chatBubbleOpacity: next })
  },

  setChatBubbleTexture: (texture) => {
    applyChatBubbleToDom(get().chatBubbleOpacity, texture)
    set({ chatBubbleTexture: texture })
  },

  setMusicBgEnabled: (enabled) => set({ musicBgEnabled: enabled }),
  setMusicBgIntensity: (intensity) => set({ musicBgIntensity: clamp01(intensity, DEFAULT_MUSIC_BG_INTENSITY) }),
  setMusicBgBlur: (blur) => set({ musicBgBlur: clampRange(blur, 0, 12, DEFAULT_MUSIC_BG_BLUR) }),
  setMusicBgSize: (size) => set({ musicBgSize: clampRange(size, 0.35, 1.6, DEFAULT_MUSIC_BG_SIZE) }),
  setMusicBgColor: (color) => set({ musicBgColor: color }),
  setLyricsPanelEnabled: (enabled) => set({ lyricsPanelEnabled: enabled }),
  setLyricsPanelOpacity: (opacity) => set({ lyricsPanelOpacity: clamp01(opacity, DEFAULT_LYRICS_PANEL_OPACITY) }),
  setLyricsFontSize: (size) => set({ lyricsFontSize: clampRange(size, 14, 42, DEFAULT_LYRICS_FONT_SIZE) }),
  setLyricsFollow: (follow) => set({ lyricsFollow: follow }),
  setLyricsLineCount: (count) => set({ lyricsLineCount: Math.round(clampRange(count, 1, 9, DEFAULT_LYRICS_LINE_COUNT)) }),
  setLyricsBlur: (blur) => set({ lyricsBlur: clampRange(blur, 0, 32, DEFAULT_LYRICS_BLUR) }),
  setMusicNowPlaying: (next) => set({ musicNowPlaying: { ...get().musicNowPlaying, ...next } }),
  requestMusicSeek: (delta) => set({ musicSeekRequest: { id: Date.now(), delta } }),

  bumpAssetVersion: () => set({ assetVersion: Date.now() }),

  addUnreadMessage: (peerId) => {
    if (!peerId) return
    const unreadMessages = get().unreadMessages
    set({ unreadMessages: { ...unreadMessages, [peerId]: (unreadMessages[peerId] ?? 0) + 1 } })
  },

  clearUnreadMessages: (peerId) => {
    if (!peerId) {
      set({ unreadMessages: {} })
      return
    }
    const unreadMessages = { ...get().unreadMessages }
    delete unreadMessages[peerId]
    set({ unreadMessages })
  },

  setToken: (token) => {
    if (token) localStorage.setItem(LS_TOKEN, token)
    else localStorage.removeItem(LS_TOKEN)
    set({ token })
  },

  openAuthPanel: () => set({ isAuthPanelOpen: true }),
  closeAuthPanel: () => set({ isAuthPanelOpen: false }),

  loginSuccess: ({ token, id, nickname, uid, email, avatarUrl, role, createTime }) => {
    get().setToken(token)
    set({
      user: {
        ...get().user,
        isLoggedIn: true,
        id,
        nickname,
        uid,
        email,
        avatarUrl,
        role,
        createTime,
        locationLatitude: undefined,
        locationLongitude: undefined,
        locationAccuracy: undefined,
        locationUpdatedAt: undefined,
      },
      isAuthPanelOpen: false,
      unreadMessages: {},
    })

    void get().bootstrapAuthProfile()
  },

  logout: () => {
    get().setToken(null)
    set({
      user: defaultUser,
      isAccountPanelOpen: false,
      isAuthPanelOpen: false,
      ledConfigRaw: null,
      backgroundImageUrl: '',
      backgroundOpacity: DEFAULT_BACKGROUND_OPACITY,
      ledGlow: DEFAULT_LED_GLOW,
      ledIntensity: DEFAULT_LED_INTENSITY,
      chatBubbleOpacity: DEFAULT_CHAT_BUBBLE_OPACITY,
      chatBubbleTexture: DEFAULT_CHAT_BUBBLE_TEXTURE,
      musicBgEnabled: DEFAULT_MUSIC_BG_ENABLED,
      musicBgIntensity: DEFAULT_MUSIC_BG_INTENSITY,
      musicBgBlur: DEFAULT_MUSIC_BG_BLUR,
      musicBgSize: DEFAULT_MUSIC_BG_SIZE,
      musicBgColor: get().ledColor,
      lyricsPanelEnabled: false,
      lyricsPanelOpacity: DEFAULT_LYRICS_PANEL_OPACITY,
      lyricsFontSize: DEFAULT_LYRICS_FONT_SIZE,
      lyricsFollow: true,
      lyricsLineCount: DEFAULT_LYRICS_LINE_COUNT,
      lyricsBlur: DEFAULT_LYRICS_BLUR,
      musicNowPlaying: { currentTime: 0, duration: 0, playing: false },
      musicSeekRequest: null,
      unreadMessages: {},
    })
    void get().bootstrapGuestConfig()
  },

  updateEmail: (email) => set({ user: { ...get().user, email } }),

  saveProfileToServer: async (p) => {
    const res = await updateProfile(p)
    const next = res.data
    if (!next) return
    set({
      user: {
        ...get().user,
        isLoggedIn: true,
        id: next.id,
        nickname: next.nickname ?? get().user.nickname,
        uid: `UID: ${next.id}`,
        email: next.email,
        avatarUrl: next.avatar ?? get().user.avatarUrl,
        role: next.role,
        locationLatitude: next.locationLatitude ?? get().user.locationLatitude,
        locationLongitude: next.locationLongitude ?? get().user.locationLongitude,
        locationAccuracy: next.locationAccuracy ?? get().user.locationAccuracy,
        locationUpdatedAt: next.locationUpdatedAt ?? get().user.locationUpdatedAt,
      },
    })
  },

  bootstrapAuthProfile: async () => {
    const token = get().token
    if (!token) {
      await get().bootstrapGuestConfig()
      return
    }

    const res = await getProfile()
    const p = res.data
    if (!p) return

    set({
      user: {
        ...get().user,
        isLoggedIn: true,
        id: p.id,
        nickname: p.nickname ?? p.username ?? get().user.nickname,
        uid: `UID: ${p.id}`,
        email: p.email,
        avatarUrl: p.avatar ?? get().user.avatarUrl,
        role: p.role,
        createTime: p.createTime,
        locationLatitude: p.locationLatitude,
        locationLongitude: p.locationLongitude,
        locationAccuracy: p.locationAccuracy,
        locationUpdatedAt: p.locationUpdatedAt,
      },
    })

    get().setLedConfigFromProfile(p.ledConfig ?? null)
  },

  bootstrapGuestConfig: async () => {
    try {
      const presets = await listBackgroundPresets()
      const backgroundImageUrl = pickRandom(presets.data ?? [])?.url ?? ''
      const color = pickRandom(GUEST_LED_COLORS) ?? '#00ffcc'
      const admin = await getAdminConfig().catch(() => ({ data: null }))
      const base = (() => {
        try {
          return admin.data ? JSON.parse(admin.data) : {}
        } catch {
          return {}
        }
      })()
      get().setLedConfigFromProfile(
        JSON.stringify({
          ...base,
          theme: 'dark',
          glow: true,
          color,
          backgroundImageUrl,
          backgroundOpacity: typeof base.backgroundOpacity === 'number' ? clampBackgroundOpacity(base.backgroundOpacity) : DEFAULT_BACKGROUND_OPACITY,
          musicBgColor: color,
        }),
      )
    } catch {
      const color = pickRandom(GUEST_LED_COLORS) ?? '#00ffcc'
      get().setLedConfigFromProfile(
        JSON.stringify({
          theme: 'dark',
          glow: true,
          color,
          intensity: DEFAULT_LED_INTENSITY,
          glassOpacity: DEFAULT_GLASS_OPACITY,
          glassTexture: DEFAULT_GLASS_TEXTURE,
          backgroundImageUrl: '',
          backgroundOpacity: DEFAULT_BACKGROUND_OPACITY,
          chatBubbleOpacity: DEFAULT_CHAT_BUBBLE_OPACITY,
          chatBubbleTexture: DEFAULT_CHAT_BUBBLE_TEXTURE,
          musicBgEnabled: DEFAULT_MUSIC_BG_ENABLED,
          musicBgIntensity: DEFAULT_MUSIC_BG_INTENSITY,
          musicBgBlur: DEFAULT_MUSIC_BG_BLUR,
          musicBgSize: DEFAULT_MUSIC_BG_SIZE,
          musicBgColor: color,
          lyricsPanelEnabled: false,
          lyricsPanelOpacity: DEFAULT_LYRICS_PANEL_OPACITY,
          lyricsFontSize: DEFAULT_LYRICS_FONT_SIZE,
          lyricsFollow: true,
          lyricsLineCount: DEFAULT_LYRICS_LINE_COUNT,
          lyricsBlur: DEFAULT_LYRICS_BLUR,
        }),
      )
    }
  },

  setLedConfigFromProfile: (raw) => {
    set({ ledConfigRaw: raw })
    const { theme, glow, color, intensity, glassOpacity, glassTexture, backgroundImageUrl, backgroundOpacity, chatBubbleOpacity, chatBubbleTexture, musicBgEnabled, musicBgIntensity, musicBgBlur, musicBgSize, musicBgColor, lyricsPanelEnabled, lyricsPanelOpacity, lyricsFontSize, lyricsFollow, lyricsLineCount, lyricsBlur } = tryParseLedConfig(raw)
    if (theme) get().setTheme(theme)
    if (typeof glow === 'boolean') get().setLedGlow(glow)
    if (color) get().setLedColor(color)
    if (typeof intensity === 'number') get().setLedIntensity(intensity)
    if (typeof glassOpacity === 'number') get().setGlassOpacity(glassOpacity)
    if (glassTexture) get().setGlassTexture(glassTexture)
    if (typeof backgroundImageUrl === 'string') get().setBackgroundImageUrl(backgroundImageUrl)
    if (typeof backgroundOpacity === 'number') get().setBackgroundOpacity(backgroundOpacity)
    if (typeof chatBubbleOpacity === 'number') get().setChatBubbleOpacity(chatBubbleOpacity)
    if (chatBubbleTexture) get().setChatBubbleTexture(chatBubbleTexture)
    if (typeof musicBgEnabled === 'boolean') get().setMusicBgEnabled(musicBgEnabled)
    if (typeof musicBgIntensity === 'number') get().setMusicBgIntensity(musicBgIntensity)
    if (typeof musicBgBlur === 'number') get().setMusicBgBlur(musicBgBlur)
    if (typeof musicBgSize === 'number') get().setMusicBgSize(musicBgSize)
    if (typeof musicBgColor === 'string') get().setMusicBgColor(musicBgColor)
    if (typeof lyricsPanelEnabled === 'boolean') get().setLyricsPanelEnabled(lyricsPanelEnabled)
    if (typeof lyricsPanelOpacity === 'number') get().setLyricsPanelOpacity(lyricsPanelOpacity)
    if (typeof lyricsFontSize === 'number') get().setLyricsFontSize(lyricsFontSize)
    if (typeof lyricsFollow === 'boolean') get().setLyricsFollow(lyricsFollow)
    if (typeof lyricsLineCount === 'number') get().setLyricsLineCount(lyricsLineCount)
    if (typeof lyricsBlur === 'number') get().setLyricsBlur(lyricsBlur)
  },

  saveLedConfigToServer: async (raw) => {
    const prev = {
      ledConfigRaw: get().ledConfigRaw,
      theme: get().theme,
      ledColor: get().ledColor,
      ledGlow: get().ledGlow,
      ledIntensity: get().ledIntensity,
      glassOpacity: get().glassOpacity,
      glassTexture: get().glassTexture,
      backgroundImageUrl: get().backgroundImageUrl,
      backgroundOpacity: get().backgroundOpacity,
      chatBubbleOpacity: get().chatBubbleOpacity,
      chatBubbleTexture: get().chatBubbleTexture,
      musicBgEnabled: get().musicBgEnabled,
      musicBgIntensity: get().musicBgIntensity,
      musicBgBlur: get().musicBgBlur,
      musicBgSize: get().musicBgSize,
      musicBgColor: get().musicBgColor,
      lyricsPanelEnabled: get().lyricsPanelEnabled,
      lyricsPanelOpacity: get().lyricsPanelOpacity,
      lyricsFontSize: get().lyricsFontSize,
      lyricsFollow: get().lyricsFollow,
      lyricsLineCount: get().lyricsLineCount,
      lyricsBlur: get().lyricsBlur,
    }

    set({ ledConfigRaw: raw })
    const { theme, glow, color, intensity, glassOpacity, glassTexture, backgroundImageUrl, backgroundOpacity, chatBubbleOpacity, chatBubbleTexture, musicBgEnabled, musicBgIntensity, musicBgBlur, musicBgSize, musicBgColor, lyricsPanelEnabled, lyricsPanelOpacity, lyricsFontSize, lyricsFollow, lyricsLineCount, lyricsBlur } = tryParseLedConfig(raw)
    if (theme) get().setTheme(theme)
    if (typeof glow === 'boolean') get().setLedGlow(glow)
    if (color) get().setLedColor(color)
    if (typeof intensity === 'number') get().setLedIntensity(intensity)
    if (typeof glassOpacity === 'number') get().setGlassOpacity(glassOpacity)
    if (glassTexture) get().setGlassTexture(glassTexture)
    if (typeof backgroundImageUrl === 'string') get().setBackgroundImageUrl(backgroundImageUrl)
    if (typeof backgroundOpacity === 'number') get().setBackgroundOpacity(backgroundOpacity)
    if (typeof chatBubbleOpacity === 'number') get().setChatBubbleOpacity(chatBubbleOpacity)
    if (chatBubbleTexture) get().setChatBubbleTexture(chatBubbleTexture)
    if (typeof musicBgEnabled === 'boolean') get().setMusicBgEnabled(musicBgEnabled)
    if (typeof musicBgIntensity === 'number') get().setMusicBgIntensity(musicBgIntensity)
    if (typeof musicBgBlur === 'number') get().setMusicBgBlur(musicBgBlur)
    if (typeof musicBgSize === 'number') get().setMusicBgSize(musicBgSize)
    if (typeof musicBgColor === 'string') get().setMusicBgColor(musicBgColor)
    if (typeof lyricsPanelEnabled === 'boolean') get().setLyricsPanelEnabled(lyricsPanelEnabled)
    if (typeof lyricsPanelOpacity === 'number') get().setLyricsPanelOpacity(lyricsPanelOpacity)
    if (typeof lyricsFontSize === 'number') get().setLyricsFontSize(lyricsFontSize)
    if (typeof lyricsFollow === 'boolean') get().setLyricsFollow(lyricsFollow)
    if (typeof lyricsLineCount === 'number') get().setLyricsLineCount(lyricsLineCount)
    if (typeof lyricsBlur === 'number') get().setLyricsBlur(lyricsBlur)

    try {
      await updateLedConfig({ ledConfig: raw })
      await get().bootstrapAuthProfile()
    } catch (e) {
      set({ ledConfigRaw: prev.ledConfigRaw })
      get().setTheme(prev.theme)
      get().setLedColor(prev.ledColor)
      get().setLedGlow(prev.ledGlow)
      get().setLedIntensity(prev.ledIntensity)
      get().setGlassOpacity(prev.glassOpacity)
      get().setGlassTexture(prev.glassTexture)
      get().setBackgroundImageUrl(prev.backgroundImageUrl)
      get().setBackgroundOpacity(prev.backgroundOpacity)
      get().setChatBubbleOpacity(prev.chatBubbleOpacity)
      get().setChatBubbleTexture(prev.chatBubbleTexture)
      get().setMusicBgEnabled(prev.musicBgEnabled)
      get().setMusicBgIntensity(prev.musicBgIntensity)
      get().setMusicBgBlur(prev.musicBgBlur)
      get().setMusicBgSize(prev.musicBgSize)
      get().setMusicBgColor(prev.musicBgColor)
      get().setLyricsPanelEnabled(prev.lyricsPanelEnabled)
      get().setLyricsPanelOpacity(prev.lyricsPanelOpacity)
      get().setLyricsFontSize(prev.lyricsFontSize)
      get().setLyricsFollow(prev.lyricsFollow)
      get().setLyricsLineCount(prev.lyricsLineCount)
      get().setLyricsBlur(prev.lyricsBlur)
      throw e
    }
  },

  toggleMusicPlayer: () => set({ isMusicPlayerOpen: !get().isMusicPlayerOpen }),
  setMusicPlayerOpen: (open) => set({ isMusicPlayerOpen: open }),

  toggleAccountPanel: () => set({ isAccountPanelOpen: !get().isAccountPanelOpen }),
  setAccountPanelOpen: (open) => set({ isAccountPanelOpen: open }),
}))

export function bootstrapTheme() {
  const { theme, ledColor, ledGlow, ledIntensity, glassOpacity, glassTexture, chatBubbleOpacity, chatBubbleTexture } = useAppStore.getState()
  applyThemeToDom(theme)
  applyLedToDom(ledColor, ledGlow, ledIntensity)
  applyGlassToDom(glassOpacity, glassTexture)
  applyChatBubbleToDom(chatBubbleOpacity, chatBubbleTexture)
}
