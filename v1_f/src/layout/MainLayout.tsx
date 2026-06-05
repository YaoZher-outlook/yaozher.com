import { useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, FolderOpen, Home, MessageSquare, Music, PackageOpen, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

import { useAppStore } from '@/store/appStore'
import MusicPlayer from '@/modules/music/MusicPlayer'
import MusicWaveBackground from '@/modules/music/MusicWaveBackground'
import FloatingLyricsPanel from '@/modules/music/FloatingLyricsPanel'
import AuthPanel from '@/modules/auth/AuthPanel'
import AccountPanel from '../modules/account/AccountPanel'
import { resolveAssetUrl } from '@/api/assets'
import GlobalChatNotifier from '@/modules/chat/GlobalChatNotifier'

type NavItem = {
  key: string
  label: string
  to: string
  icon: React.ReactNode
}

function routeIndex(pathname: string) {
  if (pathname === '/' || pathname === '/news') return 0
  if (pathname === '/download') return 1
  if (pathname === '/messages') return 2
  if (pathname === '/settings') return 3
  if (pathname === '/toolbox') return 4
  return 0
}

function SidebarNavItem({ item }: { item: NavItem }) {
  const location = useLocation()
  const navigate = useNavigate()
  const unreadTotal = useAppStore((s) => Object.values(s.unreadMessages).reduce((sum, count) => sum + count, 0))

  const active = location.pathname === item.to || (item.key === 'home' && location.pathname === '/news')
  const showUnread = item.key === 'messages' && unreadTotal > 0

  return (
    <button
      type="button"
      onClick={() => navigate(item.to)}
      className={
        'group relative flex h-full w-full items-center gap-3 px-6 text-left text-sm tracking-wide transition ' +
        (active
          ? 'led-left text-[color:var(--led-color)]'
          : 'text-white/70 hover:text-white')
      }
    >
      <span className={active ? 'text-[color:var(--led-color)]' : 'text-white/60 group-hover:text-white/80'}>
        {item.icon}
      </span>
      <span className="font-medium">{item.label}</span>
      {showUnread ? (
        <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-[color:var(--led-color)] px-1.5 py-0.5 text-[10px] font-semibold text-[rgb(var(--btn-fg-on-led))] shadow-[0_0_16px_color-mix(in_srgb,var(--led-color)_50%,transparent)]">
          {unreadTotal > 99 ? '99+' : unreadTotal}
        </span>
      ) : null}
    </button>
  )
}

export default function MainLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const outlet = useOutlet()
  const isProjectPage = false

  const user = useAppStore((s) => s.user)
  const token = useAppStore((s) => s.token)
  const assetVersion = useAppStore((s) => s.assetVersion)
  const avatarSrc = resolveAssetUrl(user.avatarUrl, assetVersion)
  const isMusicPlayerOpen = useAppStore((s) => s.isMusicPlayerOpen)
  const setMusicPlayerOpen = useAppStore((s) => s.setMusicPlayerOpen)
  const backgroundImageUrl = useAppStore((s) => s.backgroundImageUrl)
  const backgroundOpacity = useAppStore((s) => s.backgroundOpacity)
  const backgroundSrc = resolveAssetUrl(backgroundImageUrl, assetVersion)

  const isAuthPanelOpen = useAppStore((s) => s.isAuthPanelOpen)
  const openAuthPanel = useAppStore((s) => s.openAuthPanel)

  const isAccountPanelOpen = useAppStore((s) => s.isAccountPanelOpen)
  const toggleAccountPanel = useAppStore((s) => s.toggleAccountPanel)

  const pageShellClass = isProjectPage ? 'relative min-h-screen' : 'relative min-h-screen px-8 py-8'
  const previousPathRef = useRef(location.pathname)
  const routeDirection = useMemo(() => {
    const previous = previousPathRef.current
    if (previous === location.pathname) return 0
    return routeIndex(location.pathname) >= routeIndex(previous) ? 1 : -1
  }, [location.pathname])

  useEffect(() => {
    previousPathRef.current = location.pathname
  }, [location.pathname])

  const sidebarRef = useRef<HTMLElement | null>(null)
  const musicBtnWrapRef = useRef<HTMLDivElement | null>(null)
  const [musicAnchor, setMusicAnchor] = useState<{ left: number; top: number } | null>(null)
  const [musicBoundaryLeft, setMusicBoundaryLeft] = useState(128)
  const [musicWakeSignal, setMusicWakeSignal] = useState(0)

  const updateMusicAnchor = () => {
    const aside = sidebarRef.current
    const wrap = musicBtnWrapRef.current
    if (!aside || !wrap) return

    const a = aside.getBoundingClientRect()
    const w = wrap.getBoundingClientRect()

    setMusicBoundaryLeft(a.left + a.width)
    setMusicAnchor({
      left: a.left + a.width + 12,
      // nudge upward to avoid bottom overflow
      top: Math.max(12, w.top - 64),
    })
  }

  const navItems = useMemo<NavItem[]>(
    () => [
      { key: 'home', label: t('nav.home'), to: '/', icon: <Home size={18} /> },
      { key: 'download', label: t('nav.download'), to: '/download', icon: <FolderOpen size={18} /> },
      { key: 'messages', label: t('nav.messages'), to: '/messages', icon: <MessageSquare size={18} /> },
      { key: 'settings', label: t('nav.settings'), to: '/settings', icon: <Settings size={18} /> },
      { key: 'toolbox', label: '百宝箱', to: '/toolbox', icon: <PackageOpen size={18} /> },
    ],
    [t],
  )

  return (
    <div className="relative min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      {backgroundSrc ? (
        <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
          <img
            src={backgroundSrc}
            alt=""
            className="h-full w-full object-cover"
            style={{ opacity: backgroundOpacity }}
          />
          <div className="absolute inset-0 bg-[rgb(var(--bg))]/35" />
        </div>
      ) : null}
      <MusicWaveBackground />

      {/* Left Sidebar */}
      <aside
        ref={sidebarRef}
        className={[
          'fixed left-0 top-0 z-40 flex h-screen w-32 flex-col transition-colors duration-300',
          isProjectPage ? 'project-sidebar' : 'border-r border-white/10 bg-black/40',
        ].join(' ')}
      >
        {/* 1) Profile (Top 25%) */}
        <section className="flex h-1/4 flex-col items-center justify-center gap-3 px-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-white/5">
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-white/50">Avatar</div>
            )}
          </div>

          <div className="text-center">
            <div className="text-base font-semibold tracking-wide">{user.nickname}</div>
            <div className="mt-0.5 text-xs text-white/50">{user.uid}</div>
          </div>

          {!user.isLoggedIn ? (
            <button
              className="mt-1 w-full rounded-full px-4 py-2 text-xs font-medium text-black"
              style={{
                background: 'var(--led-color)',
                boxShadow: '0 0 18px color-mix(in srgb, var(--led-color) 50%, transparent)',
              }}
              onClick={() => openAuthPanel()}
            >
              {t('user.login')}
            </button>
          ) : (
            <button
              className="glass mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs text-white/60 transition hover:text-white"
              onClick={() => toggleAccountPanel()}
              aria-label="account"
            >
              <ArrowRight size={16} className="text-white/50" />
            </button>
          )}
        </section>

        {/* 2-5) Nav */}
        <nav className="flex flex-col">
          <div className="h-[10vh] min-h-[60px]">
            <SidebarNavItem item={navItems[0]!} />
          </div>
          <div className="h-[10vh] min-h-[60px]">
            <SidebarNavItem item={navItems[1]!} />
          </div>
          <div className="h-[10vh] min-h-[60px]">
            <SidebarNavItem item={navItems[2]!} />
          </div>
          <div className="h-[10vh] min-h-[60px]">
            <SidebarNavItem item={navItems[3]!} />
          </div>
          <div className="h-[10vh] min-h-[60px]">
            <SidebarNavItem item={navItems[4]!} />
          </div>
        </nav>

        <div className="flex-1" />

        {/* 7) Music Button */}
        <section ref={musicBtnWrapRef} className="h-[8vh] min-h-[64px] px-2 pb-4">
          <button
            type="button"
            onClick={() => {
              if (isMusicPlayerOpen) {
                setMusicWakeSignal((v) => v + 1)
              } else {
                setMusicPlayerOpen(true)
              }
              requestAnimationFrame(updateMusicAnchor)
            }}
            onMouseEnter={() => requestAnimationFrame(updateMusicAnchor)}
            className="glass flex h-full w-full items-center justify-start gap-2 rounded-2xl px-3 text-sm text-white/80 transition hover:text-white"
          >
            <Music size={18} />
            <span className="truncate">{t('music.toggle')}</span>
          </button>
        </section>
      </aside>

      {/* Right Content Area */}
      <main className={isProjectPage ? 'relative z-10 h-screen overflow-y-auto' : 'relative z-10 ml-32 h-screen overflow-y-auto'}>
        <motion.div
          key={location.pathname}
          initial={routeDirection === 0 ? false : { y: routeDirection * 48 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={pageShellClass}
          style={{ willChange: 'transform' }}
        >
          {outlet}
        </motion.div>
      </main>

      {/* Floating Components */}
      {isAuthPanelOpen ? <AuthPanel anchor={{ left: 8 * 16 + 12, top: 24 }} /> : null}
      {isAccountPanelOpen ? <AccountPanel anchor={{ left: 8 * 16 + 12, top: 24 }} /> : null}

      {isMusicPlayerOpen ? (
        <MusicPlayer
          anchor={musicAnchor ?? undefined}
          collapseBoundaryLeft={musicBoundaryLeft}
          revealSignal={musicWakeSignal}
          onRequestReanchor={updateMusicAnchor}
        />
      ) : null}
      <FloatingLyricsPanel />
      {token ? <GlobalChatNotifier /> : null}
    </div>
  )
}
