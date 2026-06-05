export type UserProfileVo = {
  id: number
  username: string
  nickname: string
  avatar: string
  email?: string
  role: string
  createTime?: string
  ledConfig: string
  locationLatitude?: number | null
  locationLongitude?: number | null
  locationAccuracy?: number | null
  locationUpdatedAt?: string | null
}

export type LedConfigUpdateDto = {
  ledConfig: string
}

export type UserProfileUpdateDto = {
  nickname?: string
  avatar?: string
}

export type EmailUpdateDto = {
  email: string
  code: string
}

export type UserLocationUpdateDto = {
  latitude: number
  longitude: number
  accuracy?: number
}

export type ApiKeyStatusVo = {
  hasApiKey: boolean
  hasAdminApiKey: boolean
  hasChatbotApiKey: boolean
}

export type ApiKeyUpdateDto = {
  apiKey?: string
  adminApiKey?: string
  chatbotApiKey?: string
}
