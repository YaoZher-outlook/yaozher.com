import type { ChatInboundMessage, ChatOutboundMessage } from '@/types/chat/chat'

export type ChatClientOptions = {
  baseUrl?: string // default: location.origin
  token: string
  onMessage?: (msg: ChatOutboundMessage) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (ev: Event) => void
}

function resolveWsBase(baseUrl?: string) {
  const configured = baseUrl || import.meta.env.VITE_WS_BASE || import.meta.env.VITE_API_BASE
  if (configured) {
    return configured
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '')
      .replace(/^http/i, 'ws')
  }
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}`
}

export function createChatClient(opts: ChatClientOptions) {
  const wsBase = resolveWsBase(opts.baseUrl)
  const url = `${wsBase}/ws/chat?token=${encodeURIComponent(opts.token)}`
  const ws = new WebSocket(url)

  ws.onopen = () => opts.onOpen?.()
  ws.onclose = () => opts.onClose?.()
  ws.onerror = (ev) => opts.onError?.(ev)
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as ChatOutboundMessage
      opts.onMessage?.(msg)
    } catch {
      // ignore
    }
  }

  return {
    raw: ws,
    send: (m: ChatInboundMessage) => ws.send(JSON.stringify(m)),
    close: () => ws.close(),
  }
}
