type CacheEntry<T> = {
  value?: T
  expiresAt: number
  promise?: Promise<T>
}

const cache = new Map<string, CacheEntry<unknown>>()

export async function cachedRequest<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  opts?: { force?: boolean },
): Promise<T> {
  const now = Date.now()
  const existing = cache.get(key) as CacheEntry<T> | undefined

  if (!opts?.force && existing?.value !== undefined && existing.expiresAt > now) {
    return existing.value
  }

  if (!opts?.force && existing?.promise) {
    return existing.promise
  }

  const promise = loader()
    .then((value) => {
      cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      })
      return value
    })
    .catch((error) => {
      cache.delete(key)
      throw error
    })

  cache.set(key, {
    value: existing?.value,
    expiresAt: existing?.expiresAt ?? 0,
    promise,
  })
  return promise
}

export function invalidateCache(keyPrefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key)
  }
}
