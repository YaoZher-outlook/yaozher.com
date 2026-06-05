export type ChatInboundMessage = {
  receiverId: string
  content: string
  type: 'TEXT' | 'FILE' | 'IMAGE'
  fileUrl: string | null
}

export type ChatOutboundMessage = {
  senderId: string
  receiverId: string
  type: 'TEXT' | 'FILE' | 'IMAGE'
  content: string
  fileUrl: string | null
  createTime: string
}

export type ChatContactVo = {
  id: string
  type: 'USER' | 'BOT'
  role?: string | null
  name: string
  avatar?: string | null
  email?: string | null
  createTime?: string | null
  description?: string | null
}

export type ChatMessageVo = {
  id: number
  senderId: string
  receiverId: string
  type: 'TEXT' | 'FILE' | 'IMAGE'
  content: string
  fileUrl?: string | null
  createTime?: string
}
