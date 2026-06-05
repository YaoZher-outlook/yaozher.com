import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CloudSun, Code2, ExternalLink, FileAudio, FileText, MapPin, Sparkles, Wrench } from 'lucide-react'

import { updateLocation } from '@/api/user/user'
import { getWeatherForecast } from '@/api/weather'
import { useAppStore } from '@/store/appStore'
import type { WeatherForecastVo } from '@/types/weather'

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function stableHash(input: string) {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function fortuneLabel(score: number) {
  if (score >= 96) return '天选之日'
  if (score >= 88) return '闪闪发光'
  if (score >= 76) return '顺风顺水'
  if (score >= 60) return '稳中向好'
  if (score >= 42) return '普通但可靠'
  if (score >= 24) return '适合低调'
  return '保存体力'
}

function fortuneHint(score: number) {
  if (score >= 88) return '今天适合推进重要事项，也适合大胆一点。'
  if (score >= 60) return '今天整体顺手，适合把小任务连续清掉。'
  if (score >= 42) return '今天不必用力过猛，保持节奏就很好。'
  return '今天适合整理、复盘、早睡，别和世界硬碰硬。'
}

const convenienceTools = [
  {
    name: '音乐格式转换',
    description: '将常见音乐文件转换为 .mp3 或 .flac。',
    url: 'https://convert.freelrc.com/',
    icon: <FileAudio size={18} />,
  },
  {
    name: '歌词格式转换',
    description: '将歌词文件整理并转换为 .lrc。',
    url: 'https://lrc.64h.cn/',
    icon: <FileText size={18} />,
  },
]

const developerTools = [
  {
    name: 'Bcrypt 工具',
    description: '生成或校验 Bcrypt 密文。',
    url: 'https://www.jser.com/g/bcrypt',
    icon: <Code2 size={18} />,
  },
]

function ExternalToolsSection({
  id,
  title,
  description,
  icon,
  tools,
}: {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  tools: typeof convenienceTools
}) {
  return (
    <section id={id} className="glass rounded-md">
      <div className="flex items-start gap-3 border-b border-[var(--glass-border)] px-4 py-3">
        <div className="mt-0.5 text-[rgb(var(--muted))]">{icon}</div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">{description}</p>
        </div>
      </div>

      <div className="divide-y divide-[var(--glass-border)]">
        {tools.map((tool) => (
          <a
            key={tool.name}
            href={tool.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-white/[0.06]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[var(--glass-border)] text-[color:var(--led-color)]">
                {tool.icon}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">{tool.name}</div>
                <div className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">{tool.description}</div>
              </div>
            </div>
            <ExternalLink size={16} className="shrink-0 text-[rgb(var(--muted))] transition group-hover:text-[color:var(--led-color)]" />
          </a>
        ))}
      </div>
    </section>
  )
}

export default function ToolboxPage() {
  const user = useAppStore((s) => s.user)
  const [revealed, setRevealed] = useState(false)
  const [weather, setWeather] = useState<WeatherForecastVo | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationMessage, setLocationMessage] = useState<string | null>(null)
  const [locationOverride, setLocationOverride] = useState<{ latitude: number; longitude: number } | null>(null)
  const key = todayKey()

  const score = useMemo(() => {
    if (!user.isLoggedIn || !user.id) return null
    return (stableHash(`${user.id}:${key}:daily-fortune`) % 101)
  }, [user.id, user.isLoggedIn, key])

  const requestBrowserLocation = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('浏览器不支持定位'))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        maximumAge: 30 * 60 * 1000,
        timeout: 10000,
      })
    })

  useEffect(() => {
    setWeather(null)
    setWeatherError(null)
    setLocationMessage(null)
    setLocationOverride(null)
  }, [user.id, user.isLoggedIn])

  const saveBrowserLocation = async () => {
    const position = await requestBrowserLocation()
    const next = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    }
    setLocationOverride({ latitude: next.latitude, longitude: next.longitude })
    try {
      await updateLocation(next)
      setLocationMessage('当前位置已更新')
    } catch {
      setLocationMessage('已获取当前位置，但保存到账号失败')
    }
    return next
  }

  const refreshLocation = async () => {
    if (!user.isLoggedIn) {
      setLocationMessage(null)
      setWeatherError('登录后才能获取位置')
      return
    }

    try {
      setLocationLoading(true)
      setWeatherError(null)
      await saveBrowserLocation()
    } catch (e) {
      setLocationMessage(null)
      setWeatherError(e instanceof Error ? e.message : '无法获取当前位置')
    } finally {
      setLocationLoading(false)
    }
  }

  const loadWeather = async () => {
    if (!user.isLoggedIn) {
      setWeather(null)
      setWeatherError('登录后才能查询天气预报')
      return
    }

    try {
      setWeatherLoading(true)
      setWeatherError(null)
      let latitude = locationOverride?.latitude ?? user.locationLatitude
      let longitude = locationOverride?.longitude ?? user.locationLongitude

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        const next = await saveBrowserLocation()
        latitude = next.latitude
        longitude = next.longitude
      }

      const res = await getWeatherForecast(latitude, longitude, 5)
      setWeather(res.data ?? null)
    } catch (e) {
      setWeather(null)
      setWeatherError(e instanceof Error ? e.message : '无法获取天气预报')
    } finally {
      setWeatherLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 border-b border-[var(--glass-border)] pb-4">
        <h1 className="text-2xl font-semibold">百宝箱</h1>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">一些轻量的小工具会慢慢收进这里。</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-8 md:self-start">
          <nav className="space-y-1 text-sm">
            <a href="#fortune" className="flex items-center gap-2 rounded-md px-3 py-2 text-[rgb(var(--muted))] transition hover:bg-white/10 hover:text-[rgb(var(--fg))]">
              <Sparkles size={16} />
              今日人品
            </a>
            <a href="#weather" className="flex items-center gap-2 rounded-md px-3 py-2 text-[rgb(var(--muted))] transition hover:bg-white/10 hover:text-[rgb(var(--fg))]">
              <CloudSun size={16} />
              天气预报
            </a>
            <a href="#convenience-tools" className="flex items-center gap-2 rounded-md px-3 py-2 text-[rgb(var(--muted))] transition hover:bg-white/10 hover:text-[rgb(var(--fg))]">
              <Wrench size={16} />
              便捷工具
            </a>
            <a href="#developer-tools" className="flex items-center gap-2 rounded-md px-3 py-2 text-[rgb(var(--muted))] transition hover:bg-white/10 hover:text-[rgb(var(--fg))]">
              <Code2 size={16} />
              开发工具
            </a>
          </nav>
        </aside>

        <div className="space-y-5">
          <section id="fortune" className="glass rounded-md">
            <div className="flex items-start gap-3 border-b border-[var(--glass-border)] px-4 py-3">
              <div className="mt-0.5 text-[rgb(var(--muted))]">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold">今日人品</h2>
                <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">同一账号在同一天内会得到同一个结果。</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 px-4 py-5 md:grid-cols-[220px_1fr]">
              <div>
                <div className="text-sm font-medium">今日状态</div>
                <div className="mt-1 flex items-center gap-2 text-xs leading-5 text-[rgb(var(--muted))]">
                  <CalendarDays size={14} />
                  {key}
                </div>
              </div>

              <div className="min-w-0">
                {!user.isLoggedIn ? (
                  <div className="rounded-md border border-[var(--glass-border)] px-4 py-3 text-sm text-[rgb(var(--muted))]">
                    登录后才能获取今日人品。
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <button type="button" onClick={() => setRevealed(true)} className="btn-primary inline-flex w-fit items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold">
                      <Sparkles size={16} />
                      获取今日人品
                    </button>

                    {revealed && score !== null ? (
                      <div className="glass max-w-xl rounded-md p-5">
                        <div className="flex items-end gap-3">
                          <div className="text-5xl font-semibold leading-none text-[color:var(--led-color)]">{score}</div>
                          <div className="pb-1">
                            <div className="text-lg font-semibold">{fortuneLabel(score)}</div>
                            <div className="mt-1 text-xs text-[rgb(var(--muted))]">满分 100，偶尔会溢出一点想象力。</div>
                          </div>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[color:var(--led-color)] shadow-[0_0_18px_color-mix(in_srgb,var(--led-color)_60%,transparent)]" style={{ width: `${score}%` }} />
                        </div>
                        <p className="mt-4 text-sm leading-6 text-[rgb(var(--muted))]">{fortuneHint(score)}</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section id="weather" className="glass rounded-md">
            <div className="flex items-start gap-3 border-b border-[var(--glass-border)] px-4 py-3">
              <div className="mt-0.5 text-[rgb(var(--muted))]">
                <CloudSun size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold">天气预报</h2>
                <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">获取当前位置未来几天的高低温。</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 px-4 py-5 md:grid-cols-[220px_1fr]">
              <div>
                <div className="text-sm font-medium">未来几天</div>
                <div className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">需要浏览器位置权限。</div>
              </div>

              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => void refreshLocation()} disabled={locationLoading || !user.isLoggedIn} className="btn-ghost inline-flex w-fit items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60">
                    <MapPin size={16} />
                    {locationLoading ? '获取位置中...' : '获取位置'}
                  </button>
                  <button type="button" onClick={() => void loadWeather()} disabled={weatherLoading || !user.isLoggedIn} className="btn-primary inline-flex w-fit items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60">
                    <CloudSun size={16} />
                    {weatherLoading ? '获取中...' : '获取天气预报'}
                  </button>
                  {weather?.weatherComUrl ? (
                    <a href={weather.weatherComUrl} target="_blank" rel="noreferrer" className="btn-ghost inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm">
                      weather.com
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                  {!user.isLoggedIn ? <span className="text-xs text-[rgb(var(--muted))]">登录后才能查询天气预报</span> : null}
                  {locationMessage ? <span className="text-xs text-emerald-300">{locationMessage}</span> : null}
                  {weatherError ? <span className="text-xs text-red-300">{weatherError}</span> : null}
                </div>

                {weather?.daily?.length ? (
                  <div className="grid gap-3 md:grid-cols-5">
                    {weather.daily.map((day) => (
                      <div key={day.date} className="rounded-md border border-[var(--glass-border)] bg-white/[0.04] px-3 py-4">
                        <div className="text-xs text-[rgb(var(--muted))]">{day.date.slice(5)}</div>
                        <div className="mt-2 text-sm font-semibold">{day.description}</div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-lg font-semibold text-[color:var(--led-color)]">{Math.round(day.temperatureMax ?? 0)}°</span>
                          <span className="text-xs text-[rgb(var(--muted))]">{Math.round(day.temperatureMin ?? 0)}°</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <ExternalToolsSection
            id="convenience-tools"
            title="便捷工具"
            description="常用的音乐与歌词格式整理工具。链接将在新窗口中打开。"
            icon={<Wrench size={18} />}
            tools={convenienceTools}
          />

          <ExternalToolsSection
            id="developer-tools"
            title="开发工具"
            description="开发和调试时常用的小工具。"
            icon={<Code2 size={18} />}
            tools={developerTools}
          />
        </div>
      </div>
    </div>
  )
}
