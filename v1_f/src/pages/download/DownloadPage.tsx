import { useEffect, useMemo, useRef, useState, type ReactNode, type WheelEvent as ReactWheelEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  Blocks,
  Box,
  ChevronLeft,
  ChevronRight,
  Check,
  Circle,
  CloudDownload,
  ExternalLink,
  FolderOpen,
  Github,
  ImageUp,
  Link as LinkIcon,
  Maximize2,
  PackageOpen,
  Plus,
  UploadCloud,
  X,
} from 'lucide-react'

import { publishAdminProject } from '@/api/admin'
import { resolveAssetUrl } from '@/api/assets'
import { getProjectList } from '@/api/project'
import { useActiveSection } from '@/hooks/useActiveSection'
import { useAppStore } from '@/store/appStore'
import type { ProjectDto, ProjectResourceType } from '@/types/project'

type ResourceMeta = {
  value: ProjectResourceType
  label: string
  folder: string
  description: string
  icon: ReactNode
}

const resourceTypes: ResourceMeta[] = [
  {
    value: 'OPEN_SOURCE',
    label: '开源项目',
    folder: 'open-source',
    description: '代码、仓库和可下载构建物。',
    icon: <Github size={18} />,
  },
  {
    value: 'MC_MODPACK',
    label: 'MC整合包',
    folder: 'mc-modpacks',
    description: '整合包文件和启动配置资源。',
    icon: <PackageOpen size={18} />,
  },
  {
    value: 'MC_RESOURCE_PACK',
    label: 'MC资源包',
    folder: 'mc-resource-packs',
    description: '材质、光影和资源包归档。',
    icon: <Blocks size={18} />,
  },
  {
    value: 'MC_MAP',
    label: 'MC地图存档',
    folder: 'mc-maps',
    description: '地图存档、世界文件和配套说明。',
    icon: <Box size={18} />,
  },
  {
    value: 'WEB_LINK',
    label: '网页跳转',
    folder: 'web-link',
    description: '外部页面、在线工具和跳转资源。',
    icon: <LinkIcon size={18} />,
  },
]

const resourceMetaByType = resourceTypes.reduce(
  (acc, meta) => {
    acc[meta.value] = meta
    return acc
  },
  {} as Record<ProjectResourceType, ResourceMeta>,
)

type ImmersiveState = {
  project: ProjectDto
  items: ProjectDto[]
  type: ProjectResourceType
}

function normalizeType(type?: string | null): ProjectResourceType {
  const raw = String(type ?? '').trim().toUpperCase()
  if (raw === 'MC_MODE_PACK') return 'MC_MODPACK'
  return raw in resourceMetaByType ? (raw as ProjectResourceType) : 'OPEN_SOURCE'
}

function isMcResource(type: ProjectResourceType) {
  return type === 'MC_MODPACK' || type === 'MC_RESOURCE_PACK' || type === 'MC_MAP'
}

function ResourceSection({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={id} className="glass scroll-mt-8 rounded-md">
      <div className="flex items-start gap-3 border-b border-[var(--glass-border)] px-4 py-3">
        <div className="mt-0.5 text-[rgb(var(--muted))]">{icon}</div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">{description}</p>
        </div>
      </div>
      <div className="divide-y divide-white/10">{children}</div>
    </section>
  )
}

function ResourceRow({ label, details, children }: { label: string; details: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
      <div>
        <div className="text-sm font-medium text-[rgb(var(--fg))]">{label}</div>
        <div className="mt-2">{details}</div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-md border border-[var(--glass-border)] bg-white/[0.03] px-4 text-sm text-[rgb(var(--muted))]">
      {label}
    </div>
  )
}

function CoverThumb({ project, className = '' }: { project?: ProjectDto | null; className?: string }) {
  const cover = resolveAssetUrl(project?.coverImage)

  if (!project || !cover) {
    return (
      <div className={['grid place-items-center bg-white/[0.05] text-[rgb(var(--muted))]', className].join(' ')}>
        <FolderOpen size={22} />
      </div>
    )
  }

  return <img src={cover} alt={project.name} className={['object-cover', className].join(' ')} />
}

function DownloadButton({ project, compact = false }: { project?: ProjectDto | null; compact?: boolean }) {
  const url = resolveAssetUrl(project?.downloadUrl)
  if (!project || !url) {
    return (
      <span className={['inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[var(--glass-border)] bg-white/5 text-[rgb(var(--muted))] opacity-70', compact ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'].join(' ')}>
        <CloudDownload size={compact ? 15 : 17} />
        Download
      </span>
    )
  }

  return (
    <a
      className={['btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold', compact ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'].join(' ')}
      href={url}
      target="_blank"
      rel="noreferrer"
      title="Download"
    >
      <CloudDownload size={compact ? 15 : 17} />
      Download
    </a>
  )
}

function OpenSourceWheel({
  items,
  selected,
  onSelect,
  onOpen,
}: {
  items: ProjectDto[]
  selected?: ProjectDto
  onSelect: (project: ProjectDto) => void
  onOpen: (project: ProjectDto) => void
}) {
  const wheelLockRef = useRef(0)
  const activeIndex = Math.max(0, selected ? items.findIndex((item) => item.id === selected.id) : 0)
  const itemWidth = 224

  const move = (direction: 1 | -1) => {
    if (!items.length) return
    const next = (activeIndex + direction + items.length) % items.length
    onSelect(items[next]!)
  }

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const now = Date.now()
    if (now - wheelLockRef.current < 150) return
    wheelLockRef.current = now
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (delta !== 0) move(delta > 0 ? 1 : -1)
  }

  if (!items.length) return <EmptyState label="还没有开源项目资源。" />

  return (
    <div
      tabIndex={0}
      className="relative h-52 overscroll-contain overflow-hidden rounded-md border border-[var(--glass-border)] bg-white/[0.03] outline-none transition focus:border-[color:var(--led-color)]"
      onWheelCapture={handleWheel}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') move(1)
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') move(-1)
        if (event.key === 'Enter' && selected) onOpen(selected)
      }}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-40 w-52 -translate-x-1/2 -translate-y-1/2 rounded-md border border-[color:var(--led-color)] shadow-[0_0_22px_color-mix(in_srgb,var(--led-color)_24%,transparent)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-gradient-to-r from-[rgb(var(--bg))] to-transparent opacity-75" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-l from-[rgb(var(--bg))] to-transparent opacity-75" />
      <div className="absolute left-1/2 top-1/2">
        {items.map((item, index) => {
          const offset = index - activeIndex
          const distance = Math.abs(offset)
          const active = selected?.id === item.id
          const opacity = Math.max(0.45, 1 - distance * 0.18)

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (active ? onOpen(item) : onSelect(item))}
              className="absolute h-40 w-52 overflow-hidden rounded-md border border-[var(--glass-border)] bg-black/20 text-left shadow-lg transition-all duration-300 ease-out"
              style={{
                transform: `translate(calc(-50% + ${offset * itemWidth}px), -50%) scale(${active ? 1 : 0.92})`,
                opacity,
                zIndex: 30 - distance,
              }}
            >
              <CoverThumb project={item} className="h-full w-full" />
              {active ? (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-10">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Check size={15} className="text-[color:var(--led-color)]" />
                    <span className="truncate">{item.name}</span>
                  </div>
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ResourceWheel({
  items,
  selected,
  onSelect,
}: {
  items: ProjectDto[]
  selected?: ProjectDto
  onSelect: (project: ProjectDto) => void
}) {
  const wheelLockRef = useRef(0)
  const activeIndex = Math.max(0, selected ? items.findIndex((item) => item.id === selected.id) : 0)
  const itemHeight = 104

  const move = (direction: 1 | -1) => {
    if (!items.length) return
    const next = (activeIndex + direction + items.length) % items.length
    onSelect(items[next]!)
  }

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const now = Date.now()
    if (now - wheelLockRef.current < 130) return
    wheelLockRef.current = now
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (delta !== 0) move(delta > 0 ? 1 : -1)
  }

  if (!items.length) return <EmptyState label="这个分类还没有资源。" />

  return (
    <div
      tabIndex={0}
      className="relative h-[520px] overscroll-contain overflow-hidden rounded-md border border-[var(--glass-border)] bg-white/[0.03] outline-none transition focus:border-[color:var(--led-color)]"
      onWheelCapture={handleWheel}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') move(1)
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') move(-1)
      }}
    >
      <div className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-24 -translate-y-1/2 rounded-md border border-[color:var(--led-color)] bg-white/5 shadow-[0_0_18px_color-mix(in_srgb,var(--led-color)_20%,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-[rgb(var(--bg))] to-transparent opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-[rgb(var(--bg))] to-transparent opacity-70" />

      <div className="absolute left-3 right-3 top-1/2">
        {items.map((item, index) => {
          const offset = index - activeIndex
          const distance = Math.abs(offset)
          const active = selected?.id === item.id
          const opacity = Math.max(0.62, 1 - distance * 0.1)

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className={[
                'absolute left-0 right-0 grid h-24 grid-cols-[96px_1fr] overflow-hidden rounded-md border text-left shadow-sm transition-all duration-300 ease-out',
                active ? 'border-[color:var(--led-color)] bg-white/[0.08]' : 'border-[var(--glass-border)] bg-white/[0.04] hover:bg-white/[0.07]',
              ].join(' ')}
              style={{
                transform: `translateY(calc(-50% + ${offset * itemHeight}px)) scale(${active ? 1 : 0.98})`,
                opacity,
                zIndex: 30 - distance,
              }}
            >
              <CoverThumb project={item} className="h-24 w-24" />
              <div className="min-w-0 px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
                  {active ? <Check size={14} className="text-[color:var(--led-color)]" /> : <Circle size={7} className="text-[rgb(var(--muted))]" />}
                  <span className="truncate">{item.name}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[rgb(var(--muted))]">{item.description || '暂无描述'}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ResourceSummary({
  project,
  meta,
  onOpen,
}: {
  project?: ProjectDto
  meta: ResourceMeta
  onOpen?: (project: ProjectDto) => void
}) {
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[rgb(var(--muted))]">
        {meta.icon}
        {meta.label}
      </div>
      <div>
        <h3 className="text-base font-semibold leading-6 text-[rgb(var(--fg))]">{project?.name ?? '暂无资源'}</h3>
        <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">{project?.description || '当前分类还没有详情内容。'}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {project && onOpen ? (
          <button type="button" onClick={() => onOpen(project)} className="btn-ghost inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs" title="详细查看">
            <Maximize2 size={14} />
            详细查看
          </button>
        ) : null}
        {project?.githubUrl ? (
          <a className="btn-ghost inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs" href={project.githubUrl} target="_blank" rel="noreferrer">
            <Github size={14} />
            GitHub
            <ExternalLink size={12} className="opacity-70" />
          </a>
        ) : null}
        <DownloadButton project={project} compact />
      </div>
    </div>
  )
}

function ImmersiveProjectOverlay({
  project,
  items,
  onProjectChange,
  onClose,
}: {
  project: ProjectDto
  items: ProjectDto[]
  onProjectChange: (project: ProjectDto) => void
  onClose: () => void
}) {
  const slideItems = useMemo(() => (items.length ? items : [project]), [items, project])
  const [leaving, setLeaving] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const wheelLockRef = useRef(0)
  const activeIndex = Math.max(0, slideItems.findIndex((item) => item.id === project.id))

  const move = (direction: 1 | -1) => {
    if (!slideItems.length) return
    const next = (activeIndex + direction + slideItems.length) % slideItems.length
    onProjectChange(slideItems[next]!)
  }

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const now = Date.now()
    if (now - wheelLockRef.current < 260) return
    wheelLockRef.current = now
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (delta !== 0) move(delta > 0 ? -1 : 1)
  }

  const requestClose = () => {
    if (leaving) return
    setLeaving(true)
    closeTimerRef.current = window.setTimeout(onClose, 240)
  }

  useEffect(() => {
    document.documentElement.classList.add('resource-immersive-open')
    return () => {
      document.documentElement.classList.remove('resource-immersive-open')
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') move(1)
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') move(-1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, slideItems, leaving, onClose])

  return createPortal(
    <div className={['resource-immersive-overlay fixed inset-0 z-[30] overflow-hidden bg-black text-white', leaving ? 'is-leaving' : ''].join(' ')} onWheelCapture={handleWheel}>
      <div
        className="resource-immersive-track flex h-full w-full"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {slideItems.map((item, index) => {
          const cover = resolveAssetUrl(item.coverImage)
          const type = normalizeType(item.resourceType)
          const meta = resourceMetaByType[type]
          const downloadUrl = resolveAssetUrl(item.downloadUrl)

          return (
            <section key={item.id} className="relative h-full w-full flex-none overflow-hidden bg-black">
              {cover ? <img src={cover} alt={item.name} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-[rgb(var(--bg))]" />}
              <div className="absolute inset-0 bg-black/15" />
              <div className="absolute inset-x-0 bottom-0 h-[30vh] bg-gradient-to-t from-black via-black/82 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 grid min-h-[30vh] grid-cols-1 gap-6 px-8 pb-10 pt-16 md:grid-cols-[1fr_320px] md:pl-40 md:pr-12">
                <div className={['resource-immersive-copy min-w-0 self-end', index === activeIndex ? 'is-active' : ''].join(' ')}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs text-white/72 backdrop-blur">
                    {meta.icon}
                    {meta.label}
                  </div>
                  {slideItems.length > 1 ? (
                    <div className="mt-3 text-xs text-white/45">
                      {index + 1} / {slideItems.length}
                    </div>
                  ) : null}
                  <h1 className="mt-3 text-3xl font-semibold tracking-wide text-white md:text-5xl">{item.name}</h1>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-white/78 md:text-base">{item.description || '暂无描述'}</p>
                </div>

                <div className={['resource-immersive-actions flex flex-wrap items-end justify-start gap-3 md:flex-nowrap md:justify-end', index === activeIndex ? 'is-active' : ''].join(' ')}>
                  {item.githubUrl ? (
                    <a className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm text-white backdrop-blur transition hover:bg-white/18" href={item.githubUrl} target="_blank" rel="noreferrer">
                      <Github size={17} />
                      Repository
                      <ExternalLink size={14} className="opacity-70" />
                    </a>
                  ) : null}
                  {downloadUrl ? (
                    <a
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                      style={{
                        background: 'var(--led-color)',
                        boxShadow: '0 0 18px color-mix(in srgb, var(--led-color) 50%, transparent)',
                      }}
                      href={downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Download"
                    >
                      <CloudDownload size={17} />
                      Download
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm text-white/45 backdrop-blur">
                      <CloudDownload size={17} />
                      Download
                    </span>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>
      {slideItems.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            className="resource-immersive-nav resource-immersive-nav-left glass absolute left-36 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full text-white/78 transition hover:text-white"
            aria-label="previous resource"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="resource-immersive-nav resource-immersive-nav-right glass absolute right-7 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full text-white/78 transition hover:text-white"
            aria-label="next resource"
          >
            <ChevronRight size={22} />
          </button>
        </>
      ) : null}
      <button
        type="button"
        onClick={requestClose}
        className="glass absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-md text-white/80 transition hover:text-white"
        aria-label="close immersive resource"
      >
        <X size={18} />
      </button>
    </div>,
    document.body,
  )
}

export default function DownloadPage() {
  const user = useAppStore((s) => s.user)
  const isAdmin = user.role === 'ADMIN'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectDto[]>([])
  const [selectedByType, setSelectedByType] = useState<Partial<Record<ProjectResourceType, number>>>({})
  const [immersiveState, setImmersiveState] = useState<ImmersiveState | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishMessage, setPublishMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    resourceType: 'OPEN_SOURCE' as ProjectResourceType,
    downloadUrl: '',
    githubUrl: '',
    sortOrder: '0',
  })
  const [cover, setCover] = useState<File | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getProjectList()
      const sorted = [...(res.data ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      setProjects(sorted)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProjects()
  }, [])

  const grouped = useMemo(() => {
    return resourceTypes.map((meta) => ({
      meta,
      items: projects.filter((project) => normalizeType(project.resourceType) === meta.value),
    }))
  }, [projects])

  const selectProject = (type: ProjectResourceType, project: ProjectDto) => {
    setSelectedByType((prev) => ({ ...prev, [type]: project.id }))
  }

  const selectedProject = (type: ProjectResourceType, items: ProjectDto[]) => {
    const id = selectedByType[type]
    return (id ? items.find((item) => item.id === id) : undefined) ?? items[0]
  }

  const openImmersive = (type: ProjectResourceType, project: ProjectDto, items: ProjectDto[]) => {
    setImmersiveState({ type, project, items })
  }

  const onPublish = async () => {
    if (!form.name.trim()) {
      setPublishMessage('请填写资源名称')
      return
    }
    try {
      setPublishLoading(true)
      setPublishMessage(null)
      const data = new FormData()
      data.append('name', form.name.trim())
      if (form.description.trim()) data.append('description', form.description.trim())
      data.append('resourceType', form.resourceType)
      if (form.downloadUrl.trim()) data.append('downloadUrl', form.downloadUrl.trim())
      if (form.githubUrl.trim()) data.append('githubUrl', form.githubUrl.trim())
      data.append('sortOrder', form.sortOrder || '0')
      if (cover) data.append('cover', cover)
      if (file) data.append('file', file)
      await publishAdminProject(data)
      setPublishMessage('已发布')
      setPublishOpen(false)
      setForm({ name: '', description: '', resourceType: 'OPEN_SOURCE', downloadUrl: '', githubUrl: '', sortOrder: '0' })
      setCover(null)
      setFile(null)
      await loadProjects()
    } catch (e) {
      setPublishMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setPublishLoading(false)
    }
  }

  const openSourceGroup = grouped.find((group) => group.meta.value === 'OPEN_SOURCE')!
  const openSourceSelected = selectedProject('OPEN_SOURCE', openSourceGroup.items)
  const otherGroups = grouped.filter((group) => group.meta.value !== 'OPEN_SOURCE')
  const navItems = grouped.map(({ meta }) => ({
    id: meta.value === 'OPEN_SOURCE' ? 'open-source' : meta.folder,
    label: meta.label,
    icon: meta.icon,
  }))
  const activeSection = useActiveSection(navItems.map((item) => item.id), `${loading}-${projects.length}`)

  return (
    <div className="mx-auto min-h-screen max-w-7xl text-[rgb(var(--fg))]">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit lg:sticky lg:top-8">
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

        <div className="space-y-5 pb-10">
          <header className="border-b border-[var(--glass-border)] pb-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-wide">资源</h1>
                <p className="mt-1 text-sm text-[rgb(var(--muted))]">项目、整合包、地图和跳转资源都从数据库读取。</p>
              </div>
              {isAdmin ? (
                <button type="button" onClick={() => setPublishOpen(true)} className="btn-primary inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold">
                  <Plus size={16} />
                  发布资源
                </button>
              ) : null}
            </div>
          </header>

          {loading ? <EmptyState label="正在读取资源..." /> : null}
          {error ? <EmptyState label={`资源读取失败：${error}`} /> : null}

          {!loading && !error ? (
            <>
              <ResourceSection id="open-source" icon={openSourceGroup.meta.icon} title={openSourceGroup.meta.label} description={openSourceGroup.meta.description}>
                <ResourceRow
                  label="项目"
                  details={<ResourceSummary project={openSourceSelected} meta={openSourceGroup.meta} onOpen={(project) => openImmersive('OPEN_SOURCE', project, openSourceGroup.items)} />}
                >
                  <OpenSourceWheel
                    items={openSourceGroup.items}
                    selected={openSourceSelected}
                    onSelect={(project) => selectProject('OPEN_SOURCE', project)}
                    onOpen={(project) => openImmersive('OPEN_SOURCE', project, openSourceGroup.items)}
                  />
                </ResourceRow>
              </ResourceSection>

              {otherGroups.map(({ meta, items }) => {
                const selected = selectedProject(meta.value, items)
                return (
                  <ResourceSection key={meta.value} id={meta.folder} icon={meta.icon} title={meta.label} description={meta.description}>
                    <ResourceRow
                      label="资源"
                      details={<ResourceSummary project={selected} meta={meta} onOpen={isMcResource(meta.value) ? undefined : (project) => openImmersive(meta.value, project, items)} />}
                    >
                      <ResourceWheel items={items} selected={selected} onSelect={(project) => selectProject(meta.value, project)} />
                    </ResourceRow>
                  </ResourceSection>
                )
              })}
            </>
          ) : null}
        </div>
      </div>

      {immersiveState ? (
        <ImmersiveProjectOverlay
          project={immersiveState.project}
          items={immersiveState.items}
          onProjectChange={(project) => {
            selectProject(immersiveState.type, project)
            setImmersiveState((prev) => (prev ? { ...prev, project } : prev))
          }}
          onClose={() => setImmersiveState(null)}
        />
      ) : null}

      {publishOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 px-4" onMouseDown={() => setPublishOpen(false)}>
          <div className="glass w-full max-w-2xl rounded-md p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">发布资源</div>
                <div className="mt-1 text-xs text-[rgb(var(--muted))]">资源文件会保存到对应分类目录。</div>
              </div>
              <button type="button" onClick={() => setPublishOpen(false)} className="grid h-9 w-9 place-items-center rounded-md text-[rgb(var(--muted))] hover:bg-white/10 hover:text-[rgb(var(--fg))]" aria-label="close publish">
                <X size={17} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} placeholder="名称" className="input-base rounded-md px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]" />
              <select value={form.resourceType} onChange={(e) => setForm((v) => ({ ...v, resourceType: e.target.value as ProjectResourceType }))} className="input-base rounded-md px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]">
                {resourceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <input value={form.githubUrl} onChange={(e) => setForm((v) => ({ ...v, githubUrl: e.target.value }))} placeholder="GitHub / 仓库链接" className="input-base rounded-md px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]" />
              <input value={form.downloadUrl} onChange={(e) => setForm((v) => ({ ...v, downloadUrl: e.target.value }))} placeholder="外部下载/跳转链接" className="input-base rounded-md px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]" />
              <input value={form.sortOrder} onChange={(e) => setForm((v) => ({ ...v, sortOrder: e.target.value }))} placeholder="排序" type="number" className="input-base rounded-md px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]" />
              <label className="glass inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-[rgb(var(--fg))]">
                <ImageUp size={16} />
                {cover ? cover.name : '封面图片'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
              </label>
              <label className="glass inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-[rgb(var(--fg))] md:col-span-2">
                <UploadCloud size={16} />
                {file ? file.name : '资源文件'}
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <textarea value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} placeholder="描述" rows={4} className="input-base resize-none rounded-md px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)] md:col-span-2" />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-[rgb(var(--muted))]">{publishMessage}</span>
              <button type="button" disabled={publishLoading} onClick={() => void onPublish()} className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50">
                <Plus size={16} />
                {publishLoading ? '发布中...' : '发布'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
