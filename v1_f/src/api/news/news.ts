import type { Result } from '@/types/api'
import type { NewsDto, NewsListQuery, PageResultVo } from '@/types/news/news'
import { getResult } from '@/api/http'

function toQueryString(q: NewsListQuery) {
  const params = new URLSearchParams()
  if (q.page) params.set('page', String(q.page))
  if (q.size) params.set('size', String(q.size))
  if (q.keyword) params.set('keyword', q.keyword)
  if (q.type) params.set('type', q.type)
  const s = params.toString()
  return s ? `?${s}` : ''
}

export async function getNewsList(query: NewsListQuery): Promise<Result<PageResultVo<NewsDto>>> {
  return getResult<PageResultVo<NewsDto>>(`/api/news/list${toQueryString(query)}`)
}
