import { getResult, postResult, requestJson } from '@/api/http'
import type { Result } from '@/types/api'
import type { ChatContactVo, ChatMessageVo } from '@/types/chat/chat'

export function getChatContacts(): Promise<Result<ChatContactVo[]>> {
  return getResult<ChatContactVo[]>('/api/chat/contacts', { auth: true })
}

export function getChatHistory(peerId: string): Promise<Result<ChatMessageVo[]>> {
  const query = new URLSearchParams({ peerId })
  return getResult<ChatMessageVo[]>(`/api/chat/history?${query.toString()}`, { auth: true })
}

export function clearChatView(peerId: string): Promise<Result<null>> {
  const query = new URLSearchParams({ peerId })
  return postResult<null>(`/api/chat/clear-view?${query.toString()}`, {}, { auth: true })
}

export function deleteChatHistory(peerId: string): Promise<Result<null>> {
  const query = new URLSearchParams({ peerId })
  return requestJson<Result<null>>(`/api/chat/history?${query.toString()}`, {
    method: 'DELETE',
    parseResult: true,
    auth: true,
  })
}
