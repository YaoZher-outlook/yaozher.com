import { useEffect, useState } from 'react'

export function useActiveSection(sectionIds: string[], refreshKey: unknown = '') {
  const [activeSection, setActiveSection] = useState(sectionIds[0] ?? '')
  const dependencyKey = sectionIds.join('|')

  useEffect(() => {
    if (!sectionIds.length) return

    const scrollRoot = document.querySelector('main') ?? window
    let frame = 0

    const update = () => {
      const rootTop = scrollRoot instanceof Window ? 0 : scrollRoot.getBoundingClientRect().top
      const marker = rootTop + 140
      let next = sectionIds[0] ?? ''

      for (const id of sectionIds) {
        const element = document.getElementById(id)
        if (!element) continue
        const top = element.getBoundingClientRect().top
        if (top <= marker) next = id
      }

      setActiveSection(next)
    }

    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    update()
    const later = window.setTimeout(update, 220)
    scrollRoot.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(later)
      scrollRoot.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [dependencyKey, refreshKey])

  return activeSection
}
