import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Eraser,
  Image,
  Mail,
  MoreHorizontal,
  Paperclip,
  Send,
  Shield,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { resolveAssetUrl } from '@/api/assets'
import { clearChatView, deleteChatHistory, getChatContacts, getChatHistory } from '@/api/chat'
import { uploadFile } from '@/api/upload'
import { createChatClient } from '@/api/ws/chat'
import { useAppStore } from '@/store/appStore'
import type { ChatContactVo, ChatMessageVo, ChatOutboundMessage } from '@/types/chat/chat'

type UiMessage = {
  id: string
  mine: boolean
  type: 'TEXT' | 'FILE' | 'IMAGE'
  content: string
  fileUrl?: string | null
  createTime?: string
}

function nowId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function toUiMessage(m: ChatMessageVo, userId: string): UiMessage {
  return {
    id: String(m.id),
    mine: m.senderId === userId,
    type: m.type,
    content: m.fileUrl ?? m.content,
    fileUrl: m.fileUrl,
    createTime: m.createTime,
  }
}

function groupKey(contact: ChatContactVo) {
  if (contact.type === 'BOT') return 'Chatbots'
  return contact.role || 'USER'
}

function groupLabel(key: string) {
  if (key === 'ADMIN') return 'ADMIN'
  if (key === 'FRIENDS') return 'FRIENDS'
  if (key === 'HR') return 'HR'
  if (key === 'USER') return 'USER'
  return key
}

function formatYearMonth(value?: string | null) {
  if (!value) return 'Unknown'
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value.slice(0, 7)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function useIsNarrowViewport() {
  const [isNarrow, setIsNarrow] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  })

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const update = () => setIsNarrow(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isNarrow
}

export default function MessagesPage() {
  const user = useAppStore((s) => s.user)
  const token = useAppStore((s) => s.token)
  const chatBubbleOpacity = useAppStore((s) => s.chatBubbleOpacity)
  const unreadMessages = useAppStore((s) => s.unreadMessages)
  const addUnreadMessage = useAppStore((s) => s.addUnreadMessage)
  const clearUnreadMessages = useAppStore((s) => s.clearUnreadMessages)
  const [searchParams] = useSearchParams()
  const requestedPeerId = searchParams.get('peerId') ?? ''
  const isMobile = useIsNarrowViewport()

  const userId = useMemo(() => {
    return user.id ? String(user.id) : String(user.uid ?? '').match(/(\d+)/)?.[1] ?? ''
  }, [user.id, user.uid])

  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [contacts, setContacts] = useState<ChatContactVo[]>([])
  const [receiverId, setReceiverId] = useState('')
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [profileContact, setProfileContact] = useState<ChatContactVo | null>(null)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  const clientRef = useRef<ReturnType<typeof createChatClient> | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const receiverIdRef = useRef('')

  const selectedContact = contacts.find((c) => c.id === receiverId) ?? null
  const isAdmin = user.role === 'ADMIN'

  useEffect(() => {
    const root = document.documentElement
    if (isMobile && mobileChatOpen && receiverId) {
      root.setAttribute('data-mobile-chat-open', 'true')
    } else {
      root.removeAttribute('data-mobile-chat-open')
    }
    return () => root.removeAttribute('data-mobile-chat-open')
  }, [isMobile, mobileChatOpen, receiverId])

  const groupedContacts = useMemo(() => {
    const order = ['ADMIN', 'FRIENDS', 'HR', 'USER', 'Chatbots']
    const map = new Map<string, ChatContactVo[]>()
    for (const contact of contacts) {
      const key = groupKey(contact)
      map.set(key, [...(map.get(key) ?? []), contact])
    }
    return [...map.entries()].sort((a, b) => {
      const ai = order.indexOf(a[0])
      const bi = order.indexOf(b[0])
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }, [contacts])

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const refreshContacts = () => {
    if (!token) return
    setContactsLoading(true)
    void getChatContacts()
      .then((res) => setContacts(res.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setContactsLoading(false))
  }

  useEffect(() => {
    receiverIdRef.current = isMobile && !mobileChatOpen ? '' : receiverId
  }, [receiverId, isMobile, mobileChatOpen])

  useEffect(() => {
    if (!token) {
      setContacts([])
      setReceiverId('')
      setMessages([])
      setMobileChatOpen(false)
      setContactsLoading(false)
      return
    }

    let cancelled = false
    setContactsLoading(true)
    void getChatContacts()
      .then((res) => {
        if (cancelled) return
        const list = res.data ?? []
        setContacts(list)
        setReceiverId((prev) => {
          if (requestedPeerId && list.some((c) => c.id === requestedPeerId)) {
            setMobileChatOpen(true)
            return requestedPeerId
          }
          if (prev && list.some((c) => c.id === prev)) return prev
          return isMobile ? '' : list[0]?.id ?? ''
        })
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        if (!cancelled) setContactsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, user.role, requestedPeerId, isMobile])

  useEffect(() => {
    if (!token || !receiverId) {
      setMessages([])
      setHistoryLoading(false)
      return
    }

    let cancelled = false
    setHistoryLoading(true)
    void getChatHistory(receiverId)
      .then((res) => {
        if (!cancelled) setMessages((res.data ?? []).map((m) => toUiMessage(m, userId)))
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, receiverId, userId])

  useEffect(() => {
    if (receiverId) clearUnreadMessages(receiverId)
  }, [receiverId, clearUnreadMessages])

  useEffect(() => {
    setError(null)
    setStatus('connecting')

    if (!token) {
      setStatus('closed')
      setError('Please sign in before using chat')
      return
    }

    const client = createChatClient({
      token,
      onOpen: () => {
        setStatus('open')
        setError(null)
      },
      onClose: () => setStatus('closed'),
      onError: () => setStatus('closed'),
      onMessage: (m: ChatOutboundMessage) => {
        const active = receiverIdRef.current
        if (active && (m.senderId === active || m.receiverId === active)) {
          setMessages((prev) => [
            ...prev,
            {
              id: nowId(),
              mine: m.senderId === userId,
              type: m.type,
              content: m.fileUrl ?? m.content,
              fileUrl: m.fileUrl,
              createTime: m.createTime,
            },
          ])
          if (m.senderId !== userId) clearUnreadMessages(active)
        } else if (m.senderId !== userId) {
          addUnreadMessage(m.senderId)
        }
        if (isAdmin) refreshContacts()
      },
    })

    clientRef.current = client

    return () => {
      client.close()
      clientRef.current = null
    }
  }, [token, userId, isAdmin, addUnreadMessage, clearUnreadMessages])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const sendText = () => {
    const c = clientRef.current
    const content = text.trim()
    if (!c || !content || !receiverId) return

    c.send({
      receiverId,
      content,
      type: 'TEXT',
      fileUrl: null,
    })

    setMessages((prev) => [
      ...prev,
      {
        id: nowId(),
        mine: true,
        type: 'TEXT',
        content,
      },
    ])

    setText('')
  }

  const sendFile = async (file?: File, type: 'FILE' | 'IMAGE' = 'FILE') => {
    const c = clientRef.current
    if (!c || !file || !receiverId) return
    try {
      setError(null)
      const res = await uploadFile(file)
      if (!res.data) return
      c.send({
        receiverId,
        content: file.name,
        type,
        fileUrl: res.data,
      })
      setMessages((prev) => [
        ...prev,
        {
          id: nowId(),
          mine: true,
          type,
          content: type === 'IMAGE' ? res.data! : file.name,
          fileUrl: res.data,
        },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onClearView = async () => {
    if (!receiverId) return
    if (!window.confirm('清除后，当前时间以前的聊天记录将不再显示。确定清除吗？')) return
    try {
      setError(null)
      await clearChatView(receiverId)
      setMessages([])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onDeleteHistory = async () => {
    if (!receiverId || !isAdmin) return
    if (!window.confirm('Delete all database messages with this target?')) return
    try {
      setError(null)
      await deleteChatHistory(receiverId)
      setMessages([])
      refreshContacts()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const renderContent = (m: UiMessage) => {
    const url = resolveAssetUrl(m.fileUrl ?? m.content)
    if (m.type === 'IMAGE' && url) {
      return <img src={url} alt="message attachment" className="max-h-64 rounded-xl object-contain" />
    }
    if (m.type === 'FILE' && url) {
      return (
        <a href={url} target="_blank" rel="noreferrer" className="underline">
          {m.content}
        </a>
      )
    }
    return <div className="whitespace-pre-wrap">{m.content}</div>
  }

  const rootClass = isMobile
    ? '-mx-4 -mb-28 -mt-20 h-[100dvh] overflow-hidden bg-[rgb(var(--bg))]'
    : 'mx-auto grid h-[calc(100vh-4rem)] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]'
  const chatPanelClass = isMobile
    ? mobileChatOpen
      ? 'flex h-full min-h-0 flex-col overflow-hidden bg-[rgb(var(--bg))]'
      : 'hidden'
    : 'glass flex min-h-0 flex-col overflow-hidden rounded-md'
  const contactsPanelClass = isMobile
    ? mobileChatOpen
      ? 'hidden'
      : 'flex h-full min-h-0 flex-col overflow-hidden bg-[rgb(var(--bg))]'
    : 'glass min-h-0 overflow-hidden rounded-md'
  const contactsScrollClass = isMobile ? 'min-h-0 flex-1 overflow-y-auto p-2 pb-28' : 'max-h-[calc(100vh-9rem)] overflow-y-auto p-2'

  return (
    <div className={rootClass}>
      <div className={chatPanelClass}>
        <div className="relative flex items-center gap-3 border-b border-[var(--glass-border)] bg-white/5 px-4 py-3">
          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileChatOpen(false)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[rgb(var(--fg))] transition active:bg-white/10"
              aria-label="返回消息列表"
            >
              <ArrowLeft size={21} />
            </button>
          ) : null}
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Messages</div>
            <div className="mt-1 truncate text-lg font-semibold">{selectedContact?.name ?? 'Realtime Chat'}</div>
          </div>
          <div className={['ml-auto items-center gap-2', isMobile ? 'hidden' : 'flex'].join(' ')}>
            <span className="hidden text-xs text-[rgb(var(--muted))] md:inline">
              user: {userId || 'guest'} | status: <span className="text-[rgb(var(--fg))]">{status}</span>
            </span>
            <button type="button" onClick={onClearView} disabled={!receiverId} className="glass inline-flex h-9 w-9 items-center justify-center rounded-md text-[rgb(var(--muted))] transition hover:text-[rgb(var(--fg))] disabled:opacity-40" title="Clear local view" aria-label="clear chat view">
              <Eraser size={16} />
            </button>
            {isAdmin ? (
              <button type="button" onClick={onDeleteHistory} disabled={!receiverId} className="glass inline-flex h-9 w-9 items-center justify-center rounded-md text-red-300/80 transition hover:text-red-200 disabled:opacity-40" title="Delete database history" aria-label="delete database history">
                <Trash2 size={16} />
              </button>
            ) : null}
          </div>
        </div>

        {error ? <div className="border-b border-[var(--glass-border)] px-4 py-2 text-xs text-red-300">{error}</div> : null}

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-4">
          <div className="space-y-3">
            {historyLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-[rgb(var(--muted))]">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[rgb(var(--muted))]/25 border-t-[color:var(--led-color)]" />
                正在读取聊天记录...
              </div>
            ) : null}
            {messages.map((m) => {
              const pct = Math.round(chatBubbleOpacity * 100)
              return (
                <div key={m.id} className={m.mine ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className="chat-bubble max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 text-[rgb(var(--fg))] md:max-w-[78%]"
                    style={m.mine ? { background: `color-mix(in srgb, var(--led-color) ${pct}%, transparent)` } : undefined}
                  >
                    {renderContent(m)}
                    {m.createTime ? <div className="mt-1 text-[11px] opacity-60">{m.createTime}</div> : null}
                  </div>
                </div>
              )
            })}
            {!historyLoading && !messages.length ? (
              <div className="text-sm text-[rgb(var(--muted))]">
                {receiverId ? 'No visible messages. Type and send.' : 'Select a chat target on the right.'}
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-[var(--glass-border)] bg-white/5 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4">
          <div className="flex items-end gap-2 md:gap-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendText()
                }
              }}
              rows={2}
              disabled={!receiverId || !token}
              placeholder={receiverId ? 'Message...' : 'Choose a contact first'}
              className="input-base min-h-[44px] flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-[color:var(--led-color)] disabled:opacity-50"
            />

            <div className="flex shrink-0 gap-2">
              <button type="button" disabled={!receiverId} onClick={() => fileInputRef.current?.click()} className="glass inline-flex h-11 w-11 items-center justify-center rounded-2xl text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] disabled:opacity-40" title="Attach" aria-label="attach">
                <Paperclip size={18} />
              </button>
              <button type="button" disabled={!receiverId} onClick={() => imageInputRef.current?.click()} className="glass inline-flex h-11 w-11 items-center justify-center rounded-2xl text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] disabled:opacity-40" title="Image" aria-label="image">
                <Image size={18} />
              </button>
              <button type="button" disabled={!receiverId || !text.trim()} onClick={sendText} className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold disabled:opacity-50 md:px-4">
                <Send size={16} />
                <span className="hidden md:inline">Send</span>
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => void sendFile(e.target.files?.[0], 'FILE')} />
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void sendFile(e.target.files?.[0], 'IMAGE')} />
            </div>
          </div>

          <div className="mt-2 hidden text-[11px] text-[rgb(var(--muted))] md:block">Enter to send | Shift+Enter for newline</div>
        </div>
      </div>

      <aside className={contactsPanelClass}>
        <div className="border-b border-[var(--glass-border)] px-4 py-3">
          <div className="text-sm font-semibold">Chat Targets</div>
          <div className="mt-1 text-xs text-[rgb(var(--muted))]">
            {!token ? 'Sign in to choose a target.' : isAdmin ? 'All registered users and chatbots.' : 'ADMIN and chatbot are available.'}
          </div>
        </div>

        <div className={contactsScrollClass}>
          {contactsLoading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-[rgb(var(--muted))]">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[rgb(var(--muted))]/25 border-t-[color:var(--led-color)]" />
              正在读取联系人...
            </div>
          ) : null}
          {groupedContacts.map(([key, list]) => {
            const collapsed = collapsedGroups.has(key)
            return (
              <div key={key} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(key)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold tracking-wide text-[rgb(var(--muted))] transition hover:bg-white/10 hover:text-[rgb(var(--fg))]"
                >
                  <span>
                    {groupLabel(key)} · {list.length}
                  </span>
                  {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>

                {!collapsed ? (
                  <div className="mt-1 space-y-1">
                    {list.map((contact) => {
                      const active = contact.id === receiverId
                      const avatar = resolveAssetUrl(contact.avatar)
                      const unread = unreadMessages[contact.id] ?? 0
                      return (
                        <div
                          key={`${contact.type}-${contact.id}`}
                          className={[
                            'group relative rounded-md transition',
                            active ? 'bg-[color:var(--led-color)]/18 text-[rgb(var(--fg))]' : 'text-[rgb(var(--fg))]/78 hover:bg-white/10',
                          ].join(' ')}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setReceiverId(contact.id)
                              if (isMobile) setMobileChatOpen(true)
                              clearUnreadMessages(contact.id)
                            }}
                            className="flex w-full items-center gap-3 px-3 py-3 pr-16 text-left"
                          >
                            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--glass-border)] bg-white/5">
                              {avatar ? (
                                <img src={avatar} alt={contact.name} className="h-full w-full object-cover" />
                              ) : contact.type === 'BOT' ? (
                                <Bot size={18} className="text-[color:var(--led-color)]" />
                              ) : (
                                <UserRound size={18} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{contact.name}</div>
                              <div className="mt-0.5 truncate text-xs text-[rgb(var(--muted))]">{contact.description ?? contact.type}</div>
                            </div>
                          </button>

                          {unread > 0 ? (
                            <span className="absolute right-11 top-1/2 grid min-w-5 -translate-y-1/2 place-items-center rounded-full bg-[color:var(--led-color)] px-1.5 py-0.5 text-[10px] font-semibold text-[rgb(var(--btn-fg-on-led))]">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          ) : null}

                          {contact.type === 'USER' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setProfileContact(contact)
                              }}
                              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-[rgb(var(--muted))] opacity-0 transition hover:bg-white/10 hover:text-[rgb(var(--fg))] group-hover:opacity-100"
                              aria-label="more profile"
                              title="More"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}

          {!contactsLoading && !contacts.length ? (
            <div className="px-3 py-4 text-sm text-[rgb(var(--muted))]">
              {!token ? 'No targets before login.' : isAdmin ? 'No users registered yet.' : 'No targets available.'}
            </div>
          ) : null}
        </div>
      </aside>

      {profileContact ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 px-4" onMouseDown={() => setProfileContact(null)}>
          <div className="glass w-full max-w-sm rounded-md p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Shield size={16} className="text-[color:var(--led-color)]" />
                Profile card
              </div>
              <button type="button" onClick={() => setProfileContact(null)} className="grid h-8 w-8 place-items-center rounded-md text-[rgb(var(--muted))] hover:bg-white/10 hover:text-[rgb(var(--fg))]" aria-label="close profile">
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--glass-border)] bg-white/5">
                {profileContact.avatar ? <img src={resolveAssetUrl(profileContact.avatar)} alt={profileContact.name} className="h-full w-full object-cover" /> : <UserRound size={28} />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xl font-semibold">{profileContact.name}</div>
                <div className="mt-1 text-sm text-[rgb(var(--muted))]">{profileContact.role ?? 'USER'}</div>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-3 rounded-md border border-[var(--glass-border)] px-3 py-2 text-[rgb(var(--muted))]">
                <CalendarDays size={16} />
                <span>Registered {formatYearMonth(profileContact.createTime)}</span>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-[var(--glass-border)] px-3 py-2 text-[rgb(var(--muted))]">
                <Mail size={16} />
                <span className="min-w-0 truncate">{profileContact.email || 'No email bound'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
