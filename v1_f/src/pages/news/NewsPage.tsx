import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

import { resolveAssetUrl } from '@/api/assets'
import { getNewsList } from '@/api/news/news'
import type { NewsDto } from '@/types/news/news'

function NewsCard({
  item,
  expanded,
  onToggle,
  onExpanded,
}: {
  item: NewsDto
  expanded: boolean
  onToggle: () => void
  onExpanded: () => void
}) {
  const spring = {
    type: 'spring' as const,
    stiffness: 170,
    damping: 28,
    mass: 1.25,
  }

  return (
    <motion.article
      layout
      layoutRoot
      initial={false}
      transition={spring}
      className={
        'glass overflow-hidden rounded-3xl border border-white/10 bg-black/30 transition ' +
        (expanded ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.06)]' : 'hover:shadow-led')
      }
    >
      <button
        type="button"
        onClick={() => {
          const nextExpanded = !expanded
          onToggle()
          if (nextExpanded) onExpanded()
        }}
        className="group block w-full text-left"
      >
        <div className="relative h-64 w-full overflow-hidden">
          {item.coverImage ? (
            <img src={resolveAssetUrl(item.coverImage)} alt={item.title} className="h-full w-full object-cover opacity-90" />
          ) : (
            <div className="h-full w-full bg-white/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          <div data-force-dark className="pointer-events-none absolute inset-0">
            <div className="pointer-events-auto absolute left-5 top-5 rounded-full bg-black/55 px-3 py-1 text-xs text-white/80 backdrop-blur">
              {item.type}
            </div>
            <div className="absolute right-5 top-5 text-xs text-white/55">{item.createTime}</div>

            <div className="absolute bottom-4 left-5 right-5">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-wide text-white">{item.title}</h2>
                <span
                  className={
                    'pointer-events-none inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 transition ' +
                    (expanded ? 'rotate-180 text-white' : 'group-hover:text-white')
                  }
                  aria-hidden
                >
                  <ChevronDown size={18} />
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-white/65">{item.content}</p>
            </div>
          </div>
        </div>
      </button>

      <motion.section
        layout
        initial={false}
        animate={{
          opacity: expanded ? 1 : 0,
          height: expanded ? 'auto' : 0,
        }}
        transition={{
          opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          height: spring,
        }}
        style={{ overflow: 'hidden' }}
        aria-hidden={!expanded}
      >
        <div className="px-6 py-6">
          <div className="whitespace-pre-wrap text-sm leading-7 text-white/80">{item.content}</div>
          <div className="mt-4 text-xs text-white/40">views: {item.viewCount ?? 0}</div>
        </div>
      </motion.section>
    </motion.article>
  )
}

function NewsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="glass overflow-hidden rounded-3xl border border-white/10 bg-black/30">
          <div className="h-64 animate-pulse bg-white/[0.06]" />
          <div className="space-y-3 px-6 py-5">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/[0.08]" />
            <div className="h-6 w-2/3 animate-pulse rounded-md bg-white/[0.08]" />
            <div className="h-4 w-full animate-pulse rounded-md bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function NewsPage() {
  const [page, setPage] = useState(1)
  const [size] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<string>('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<NewsDto[]>([])
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const canPrev = page > 1
  const canNext = page * size < total

  const query = useMemo(
    () => ({
      page,
      size,
      keyword: keyword.trim() || undefined,
      type: type || undefined,
    }),
    [page, size, keyword, type],
  )

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        setLoading(true)
        setError(null)
        const res = await getNewsList(query)
        if (cancelled) return
        const records = res.data?.records ?? []
        setTotal(res.data?.total ?? 0)
        setItems(records)
        setExpandedId((prev) => (prev && records.some((n) => n.id === prev) ? prev : records[0]?.id ?? null))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [query])

  const scrollCardToTop = (id: number) => {
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.22em] text-white/40">News</div>
        <div className="mt-2 text-2xl font-semibold tracking-wide">Announcements & Updates</div>
      </div>

      <div className="glass mb-6 rounded-3xl border border-white/10 bg-black/20 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_200px]">
          <label className="input-base flex items-center gap-2 rounded-2xl px-4 py-3">
            <Search size={18} className="opacity-60" />
            <input
              value={keyword}
              onChange={(e) => {
                setPage(1)
                setKeyword(e.target.value)
              }}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search news"
            />
          </label>

          <select
            value={type}
            onChange={(e) => {
              setPage(1)
              setType(e.target.value)
            }}
            className="input-base rounded-2xl px-4 py-3 text-sm outline-none"
          >
            <option value="">All types</option>
            <option value="公告">公告</option>
            <option value="更新">更新</option>
            <option value="日常">日常</option>
          </select>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canPrev}
              className="btn-ghost rounded-2xl px-4 py-3 text-sm disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNext}
              className="btn-ghost rounded-2xl px-4 py-3 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {loading ? <NewsLoadingSkeleton /> : null}
      {error ? <div className="text-sm text-red-300">Failed: {error}</div> : null}

      <div className="space-y-6">
        {!loading && items.map((item) => (
          <div
            key={item.id}
            ref={(node) => {
              cardRefs.current[item.id] = node
            }}
          >
            <NewsCard
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
              onExpanded={() => scrollCardToTop(item.id)}
            />
          </div>
        ))}
      </div>

      {!loading && !items.length ? <div className="text-sm text-white/50">No news found.</div> : null}

      <div className="mt-6 text-xs text-white/45">
        total: {total} | page: {page} | size: {size}
      </div>

      <div className="h-10" />
    </div>
  )
}
