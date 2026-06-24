import { API_BASE, getResult } from '@/api/http'
import { cachedRequest } from '@/api/cache'
import type { Result } from '@/types/api'
import type { AssetOptionVo } from '@/types/assets'

export function resolveAssetUrl(url?: string | null, version?: number | string | null) {
  if (!url) return undefined
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('/')) {
    const base = `${API_BASE}${url}`
    return version ? `${base}${base.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(version))}` : base
  }
  return url
}

export function listBackgroundPresets(): Promise<Result<AssetOptionVo[]>> {
  return cachedRequest(
    'assets:background-presets',
    10 * 60 * 1000,
    () => getResult<AssetOptionVo[]>('/api/assets/background-presets'),
  )
}
