export type LyricLine = {
  time: number
  text: string
}

const TIME_PATTERN = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?]/g

function toSeconds(min: string, sec: string, fraction?: string) {
  const minutes = Number(min)
  const seconds = Number(sec)
  const frac = fraction ? Number(`0.${fraction.padEnd(3, '0').slice(0, 3)}`) : 0
  return minutes * 60 + seconds + frac
}

export function parseLyrics(raw: string) {
  const lines: LyricLine[] = []
  const textLines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of textLines) {
    TIME_PATTERN.lastIndex = 0
    const matches = [...line.matchAll(TIME_PATTERN)]
    if (!matches.length) continue
    const text = line.replace(TIME_PATTERN, '').trim()
    if (!text) continue
    for (const match of matches) {
      lines.push({
        time: toSeconds(match[1]!, match[2]!, match[3]),
        text,
      })
    }
  }

  if (lines.length) return lines.sort((a, b) => a.time - b.time)

  return textLines.map((text, index) => ({
    time: index * 4,
    text,
  }))
}

export function fallbackLyrics(title?: string, artist?: string): LyricLine[] {
  const name = title || '当前歌曲'
  return [
    { time: 0, text: name },
    { time: 4, text: artist || '未知作者' },
    { time: 8, text: '当前歌曲没有歌词，请联系管理员添加' },
  ]
}

export function activeLyricIndex(lines: LyricLine[], currentTime: number) {
  if (!lines.length) return -1
  let active = 0
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i]!.time <= currentTime + 0.15) active = i
    else break
  }
  return active
}

export function lyricWindow(lines: LyricLine[], activeIndex: number, count: number) {
  if (!lines.length) return []
  const visible = Math.max(1, count)
  const before = Math.floor((visible - 1) / 2)
  const start = Math.max(0, Math.min(lines.length - visible, activeIndex - before))
  return lines.slice(start, start + visible).map((line, index) => ({
    ...line,
    absoluteIndex: start + index,
  }))
}

export function lyricVisualStyle(lineIndex: number, activeIndex: number) {
  if (lineIndex === activeIndex) {
    return { filter: 'none', opacity: 1 }
  }

  const distance = Math.max(1, Math.abs(lineIndex - activeIndex))
  const afterCurrent = lineIndex > activeIndex
  const blur = afterCurrent
    ? Math.min(1.1, 0.2 + (distance - 1) * 0.28)
    : Math.min(1.35, 0.46 + (distance - 1) * 0.3)
  const opacity = afterCurrent
    ? Math.max(0.56, 0.82 - (distance - 1) * 0.13)
    : Math.max(0.42, 0.64 - (distance - 1) * 0.1)

  return {
    filter: `blur(${blur.toFixed(2)}px)`,
    opacity,
  }
}
