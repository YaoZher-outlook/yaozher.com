import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bot, MessageSquare, UserRound } from 'lucide-react'

import { resolveAssetUrl } from '@/api/assets'
import { getChatContacts } from '@/api/chat'
import { createChatClient } from '@/api/ws/chat'
import { useAppStore } from '@/store/appStore'
import type { ChatContactVo, ChatOutboundMessage } from '@/types/chat/chat'

type ToastItem = {
  id: string
  peerId: string
  title: string
  body: string
  avatar?: string | null
  type?: ChatContactVo['type']
  leaving: boolean
}

const MAX_TOASTS = 4
const TOAST_VISIBLE_MS = 5200
const TOAST_EXIT_MS = 260

function toastId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function previewMessage(message: ChatOutboundMessage) {
  if (message.type === 'IMAGE') return '[Image]'
  if (message.type === 'FILE') return message.content || '[File]'
  return (message.content || '').replace(/\s+/g, ' ').trim() || '[Message]'
}

function contactFallback(peerId: string) {
  return peerId.startsWith('-') ? 'Chatbot' : `User ${peerId}`
}

export default function GlobalChatNotifier() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = useAppStore((s) => s.token)
  const user = useAppStore((s) => s.user)
  const addUnreadMessage = useAppStore((s) => s.addUnreadMessage)
  const unreadTotal = useAppStore((s) => Object.values(s.unreadMessages).reduce((sum, count) => sum + count, 0))
  const assetVersion = useAppStore((s) => s.assetVersion)

  const [toasts, setToasts] = useState<ToastItem[]>([])
  const contactsRef = useRef<Map<string, ChatContactVo>>(new Map())
  const timersRef = useRef<number[]>([])
  const isMessagesPage = location.pathname === '/messages'

  const userId = useMemo(() => {
    return user.id ? String(user.id) : String(user.uid ?? '').match(/(\d+)/)?.[1] ?? ''
  }, [user.id, user.uid])

  useEffect(() => {
    if (isMessagesPage || !token) setToasts([])
  }, [isMessagesPage, token])

  useEffect(() => {
    if (!token || isMessagesPage) return
    let cancelled = false

    void getChatContacts()
      .then((res) => {
        if (cancelled) return
        contactsRef.current = new Map((res.data ?? []).map((contact) => [contact.id, contact]))
      })
      .catch(() => {
        contactsRef.current = new Map()
      })

    return () => {
      cancelled = true
    }
  }, [token, isMessagesPage])

  useEffect(() => {
    if (!token || !userId || isMessagesPage) return

    let alive = true
    let reconnectTimer = 0
    let client: ReturnType<typeof createChatClient> | null = null

    const scheduleRemoval = (id: string) => {
      const leaveTimer = window.setTimeout(() => {
        setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)))
      }, TOAST_VISIBLE_MS)
      const removeTimer = window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
      }, TOAST_VISIBLE_MS + TOAST_EXIT_MS)
      timersRef.current.push(leaveTimer, removeTimer)
    }

    const pushToast = (message: ChatOutboundMessage) => {
      const peerId = message.senderId === userId ? message.receiverId : message.senderId
      if (!peerId || message.senderId === userId) return

      const contact = contactsRef.current.get(peerId)
      const item: ToastItem = {
        id: toastId(),
        peerId,
        title: contact?.name ?? contactFallback(peerId),
        body: previewMessage(message),
        avatar: contact?.avatar,
        type: contact?.type,
        leaving: false,
      }

      addUnreadMessage(peerId)
      setToasts((prev) => [...prev, item].slice(-MAX_TOASTS))
      scheduleRemoval(item.id)
    }

    const connect = () => {
      client = createChatClient({
        token,
        onMessage: pushToast,
        onClose: () => {
          if (!alive) return
          reconnectTimer = window.setTimeout(connect, 4500)
        },
        onError: () => {
          // The global notifier is silent by design. The chat page itself shows real API errors.
        },
      })
    }

    connect()

    return () => {
      alive = false
      window.clearTimeout(reconnectTimer)
      client?.close()
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current = []
    }
  }, [token, userId, isMessagesPage, addUnreadMessage])

  if (!token || isMessagesPage || (!toasts.length && !unreadTotal)) return null

  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[90] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3">
      {unreadTotal > 0 ? (
        <div className="message-toast-summary glass ml-auto inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-[rgb(var(--fg))] shadow-2xl">
          <MessageSquare size={14} className="text-[color:var(--led-color)]" />
          <span>{unreadTotal} unread message{unreadTotal > 1 ? 's' : ''}</span>
        </div>
      ) : null}

      {toasts.map((toast) => {
        const avatar = resolveAssetUrl(toast.avatar, assetVersion)
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => navigate(`/messages?peerId=${encodeURIComponent(toast.peerId)}`)}
            className={[
              'message-toast glass pointer-events-auto flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-[rgb(var(--fg))] shadow-2xl',
              toast.leaving ? 'message-toast-leaving' : '',
            ].join(' ')}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--glass-border)] bg-white/10">
              {avatar ? (
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : toast.type === 'BOT' || toast.peerId.startsWith('-') ? (
                <Bot size={18} className="text-[color:var(--led-color)]" />
              ) : (
                <UserRound size={18} className="text-[rgb(var(--muted))]" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{toast.title}</span>
              <span className="mt-0.5 block truncate text-xs text-[rgb(var(--muted))]">{toast.body}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
