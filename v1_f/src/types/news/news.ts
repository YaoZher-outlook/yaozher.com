export type PageResultVo<T> = {
  total: number
  page: number
  size: number
  records: T[]
}

export type NewsDto = {
  id: number
  title: string
  content: string
  coverImage: string
  type: string
  createTime: string
  viewCount?: number
}

export type NewsListQuery = {
  page?: number
  size?: number
  keyword?: string
  type?: string
}
