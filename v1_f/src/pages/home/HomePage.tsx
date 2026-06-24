import { useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { ChevronDown, CloudSun, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'

import { getCurrentWeather } from '@/api/weather'
import { updateLocation } from '@/api/user/user'
import NewsPage from '@/pages/news/NewsPage'
import { useAppStore } from '@/store/appStore'
import type { WeatherCurrentVo } from '@/types/weather'

function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return useMemo(
    () => ({
      time: new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now),
      date: new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(now),
    }),
    [now],
  )
}

export default function HomePage() {
  const user = useAppStore((s) => s.user)
  const heroRef = useRef<HTMLElement | null>(null)
  const newsRef = useRef<HTMLElement | null>(null)
  const wheelLockRef = useRef(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const clock = useClock()
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(() => {
    if (typeof user.locationLatitude === 'number' && typeof user.locationLongitude === 'number') {
      return { latitude: user.locationLatitude, longitude: user.locationLongitude }
    }
    return null
  })
  const [weather, setWeather] = useState<WeatherCurrentVo | null>(null)

  useEffect(() => {
    if (!user.isLoggedIn || !user.id) {
      setCoords(null)
      setWeather(null)
      return
    }

    if (typeof user.locationLatitude === 'number' && typeof user.locationLongitude === 'number') {
      setCoords({ latitude: user.locationLatitude, longitude: user.locationLongitude })
      return
    }

    if (!('geolocation' in navigator)) return
    const requestKey = `yaozher.location.requested.${user.id}`
    if (sessionStorage.getItem(requestKey)) return
    sessionStorage.setItem(requestKey, '1')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
        setCoords({ latitude: next.latitude, longitude: next.longitude })
        void updateLocation(next).catch(() => undefined)
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 30 * 60 * 1000, timeout: 10000 },
    )
  }, [user.id, user.isLoggedIn, user.locationLatitude, user.locationLongitude])

  useEffect(() => {
    if (!user.isLoggedIn || !coords) {
      setWeather(null)
      return
    }
    let cancelled = false
    void getCurrentWeather(coords.latitude, coords.longitude)
      .then((res) => {
        if (!cancelled) setWeather(res.data ?? null)
      })
      .catch(() => {
        if (!cancelled) setWeather(null)
      })
    return () => {
      cancelled = true
    }
  }, [coords, user.isLoggedIn])

  const enterNews = () => {
    newsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const returnHome = () => {
    heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const lockWheel = () => {
    const now = Date.now()
    if (now - wheelLockRef.current < 850) return false
    wheelLockRef.current = now
    return true
  }

  const onHeroWheel = (event: ReactWheelEvent<HTMLElement>) => {
    if (event.deltaY <= 12 || !lockWheel()) return
    event.preventDefault()
    enterNews()
  }

  const onNewsWheel = (event: ReactWheelEvent<HTMLElement>) => {
    if (event.deltaY >= -12) return
    const main = newsRef.current?.closest('main')
    const mainTop = main?.getBoundingClientRect().top ?? 0
    const newsTop = newsRef.current?.getBoundingClientRect().top ?? 0
    const atNewsTop = Math.abs(newsTop - mainTop) < 28
    if (!atNewsTop || !lockWheel()) return

    event.preventDefault()
    returnHome()
  }

  const rememberTouch = (event: ReactTouchEvent<HTMLElement>) => {
    const touch = event.touches[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const onHeroTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    touchStartRef.current = null
    if (!start || !touch) return
    const deltaY = touch.clientY - start.y
    const deltaX = touch.clientX - start.x
    if (deltaY < -44 && Math.abs(deltaY) > Math.abs(deltaX) && lockWheel()) enterNews()
  }

  const onNewsTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    touchStartRef.current = null
    if (!start || !touch) return
    const deltaY = touch.clientY - start.y
    const deltaX = touch.clientX - start.x
    if (deltaY <= 44 || Math.abs(deltaY) <= Math.abs(deltaX)) return

    const main = newsRef.current?.closest('main')
    const mainTop = main?.getBoundingClientRect().top ?? 0
    const newsTop = newsRef.current?.getBoundingClientRect().top ?? 0
    if (Math.abs(newsTop - mainTop) < 28 && lockWheel()) returnHome()
  }

  return (
    <div className="-mx-4 -mb-28 -mt-20 md:-mx-8 md:-my-8">
      <section
        ref={heroRef}
        className="relative grid min-h-[100dvh] place-items-center overflow-hidden px-6"
        onWheel={onHeroWheel}
        onTouchStart={rememberTouch}
        onTouchEnd={onHeroTouchEnd}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,color-mix(in_srgb,var(--led-color)_16%,transparent),transparent_38%)]" />

        {weather ? (
          <a
            href={weather.weatherComUrl}
            target="_blank"
            rel="noreferrer"
            className="glass absolute right-6 top-6 inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[rgb(var(--fg))] transition hover:border-[color:var(--led-color)] hover:text-[color:var(--led-color)]"
            title="查看 weather.com"
          >
            <CloudSun size={19} />
            <span className="font-semibold">{Math.round(weather.temperature ?? 0)}°C</span>
            <span className="text-xs text-[rgb(var(--muted))]">{weather.description}</span>
            <MapPin size={14} className="text-[rgb(var(--muted))]" />
          </a>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center text-center"
        >
          <div className="select-none text-6xl font-semibold leading-none tracking-normal text-[rgb(var(--fg))] md:text-8xl">
            {clock.time}
          </div>
          <div className="mt-4 text-sm text-[rgb(var(--muted))] md:text-base">{clock.date}</div>
        </motion.div>

        <button
          type="button"
          onClick={enterNews}
          className="absolute bottom-9 left-1/2 flex -translate-x-1/2 flex-col items-center text-sm text-[rgb(var(--fg))]/80 transition hover:text-[color:var(--led-color)] focus:outline-none focus:ring-2 focus:ring-[color:var(--led-color)]/35"
          aria-label="scroll to news"
        >
          <span className="leading-none">Whats new</span>
          <span className="mt-1 text-xs text-[rgb(var(--muted))]">看看新鲜事</span>
          <ChevronDown size={18} className="home-scroll-cue mt-2" />
        </button>
      </section>

      <section ref={newsRef} className="min-h-[100dvh] px-4 py-6 md:px-8 md:py-8" onWheelCapture={onNewsWheel} onTouchStart={rememberTouch} onTouchEnd={onNewsTouchEnd}>
        <NewsPage />
      </section>
    </div>
  )
}
