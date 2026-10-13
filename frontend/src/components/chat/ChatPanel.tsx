// Ask-the-Advisor chat panel: floating button + slide-in SSE chat.
import { MessageSquare, RefreshCw, Send, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ApiError, fetchChatHistory, fetchChatSeeds, getHealth, saveChatHistory, streamChat } from '../../api'
import type { AssessmentReport, ChatMessage, ChatSeed } from '../../types'
import { Button, cx, Spinner } from '../ui'

type ChatProvider = 'claude' | 'gemini' | 'demo'

// Cached per panel lifetime — fetched on first mount.
let cachedProvider: ChatProvider | null = null

function providerLabel(p: ChatProvider | null): string {
  if (p === 'gemini') return 'Powered by Gemini Flash'
  if (p === 'demo') return 'Running offline — demo mode'
  return 'Powered by Claude'
}

// Chat history is persisted on the backend (data/chats/<report-id>.json), so
// opening a past assessment restores its full conversation. We keep a tiny
// sessionStorage cache so the panel paints instantly on re-open, then
// reconcile with the backend copy.
const STORAGE_PREFIX = 'cc-chat:'

function cachedMessages(reportId: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + reportId)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as ChatMessage[]
  } catch {
    /* ignore */
  }
  return []
}

function cacheMessages(reportId: string, messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + reportId, JSON.stringify(messages))
  } catch {
    /* ignore */
  }
}

export function ChatPanel({ report }: { report: AssessmentReport }) {
  const [open, setOpen] = useState(false)
  const [provider, setProvider] = useState<ChatProvider | null>(cachedProvider)
  const [messages, setMessages] = useState<ChatMessage[]>(() => cachedMessages(report.id))
  const [seeds, setSeeds] = useState<ChatSeed[] | null>(null)
  const [seedsError, setSeedsError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch chat provider once per panel lifetime; the shape is a superset of HealthResponse.
  useEffect(() => {
    if (cachedProvider !== null) return
    let cancelled = false
    getHealth()
      .then((h) => {
        const p = (h as unknown as { chat_provider?: string }).chat_provider
        const next: ChatProvider = p === 'gemini' ? 'gemini' : p === 'demo' ? 'demo' : 'claude'
        cachedProvider = next
        if (!cancelled) setProvider(next)
      })
      .catch(() => {
        // Backend unreachable → treat as offline/demo for the footer copy.
        cachedProvider = 'demo'
        if (!cancelled) setProvider('demo')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Reset state when the report id changes, then hydrate from the backend
  // (so opening a past assessment restores its chat history across reloads).
  useEffect(() => {
    setMessages(cachedMessages(report.id))
    setSeeds(null)
    setSeedsError(null)
    setMessageError(null)
    setNetworkError(null)
    setStreaming(false)
    abortRef.current?.abort()
    abortRef.current = null

    let cancelled = false
    fetchChatHistory(report.id)
      .then((h) => {
        if (cancelled) return
        if (Array.isArray(h.messages) && h.messages.length > 0) {
          setMessages(h.messages)
          cacheMessages(report.id, h.messages)
        }
      })
      .catch(() => { /* non-fatal; cached messages still render */ })
    return () => { cancelled = true }
  }, [report.id])

  // Mirror to sessionStorage for instant repaint, and persist to the backend
  // (fire-and-forget) so refreshes and open-from-recent restore the thread.
  useEffect(() => {
    cacheMessages(report.id, messages)
    if (messages.length === 0 || streaming) return
    saveChatHistory(report.id, messages).catch(() => { /* non-fatal */ })
  }, [report.id, messages, streaming])

  // Fetch seeds when panel opens.
  useEffect(() => {
    if (!open || seeds !== null) return
    let cancelled = false
    fetchChatSeeds(report.id)
      .then((r) => !cancelled && setSeeds(r.seeds))
      .catch((err: unknown) => {
        if (cancelled) return
        setSeedsError(err instanceof Error ? err.message : String(err))
        setSeeds([])
      })
    return () => {
      cancelled = true
    }
  }, [open, report.id, seeds])

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open, streaming])

  // Lock body scroll ONLY on narrow screens (full-screen sheet). On desktop the panel is a side rail
  // and page scroll should still work.
  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia('(max-width: 639px)')
    const apply = () => {
      document.body.classList.toggle('cc-no-scroll', open && mq.matches)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.body.classList.remove('cc-no-scroll')
    }
  }, [open])

  // Close on Escape when open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim()
      if (!trimmed || streaming) return

      setMessageError(null)
      setNetworkError(null)

      const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }, { role: 'assistant', content: '' }]
      setMessages(nextMessages)
      setStreaming(true)

      const ctrl = new AbortController()
      abortRef.current = ctrl

      // Send history WITHOUT the empty assistant placeholder.
      const outbound = nextMessages.slice(0, -1)
      try {
        await streamChat({
          reportId: report.id,
          messages: outbound,
          signal: ctrl.signal,
          onDelta: (text) => {
            setMessages((prev) => {
              if (!prev.length) return prev
              const last = prev[prev.length - 1]
              if (last.role !== 'assistant') return prev
              return [...prev.slice(0, -1), { role: 'assistant', content: last.content + text }]
            })
          },
          onError: (msg) => setMessageError(msg),
        })
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const msg =
          err instanceof ApiError
            ? err.kind === 'network'
              ? 'Chat is unreachable – is the backend running?'
              : err.message
            : err instanceof Error
              ? err.message
              : String(err)
        setNetworkError(msg)
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [messages, report.id, streaming],
  )

  const retry = useCallback(() => {
    // Replay the last user message.
    const idx = [...messages].reverse().findIndex((m) => m.role === 'user')
    if (idx === -1) return
    const userIndex = messages.length - 1 - idx
    const prompt = messages[userIndex].content
    // Drop any trailing assistant message that was in-flight.
    const base = messages.slice(0, userIndex)
    setMessages(base)
    setNetworkError(null)
    setTimeout(() => sendPrompt(prompt), 0)
  }, [messages, sendPrompt])

  const onSend = () => {
    const text = input
    setInput('')
    sendPrompt(text)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="no-print group fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-medium text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:bg-slate-800 hover:shadow-xl"
          aria-label="Open the advisor chat"
        >
          <MessageSquare className="size-4" aria-hidden />
          Ask the advisor
        </button>
      )}

      {/* Backdrop on mobile only */}
      {open && (
        <div
          className="no-print fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity sm:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Panel: full-screen sheet on mobile, right rail on >= sm. Uses dvh so iOS/Android chrome
          doesn't push content off-screen, and max-width keeps it from overflowing viewport. */}
      <div
        className={cx(
          'no-print fixed right-0 top-0 z-50 flex w-full flex-col overflow-hidden border-slate-200 bg-white shadow-2xl transition-transform duration-250 ease-out sm:border-l',
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none',
        )}
        style={{
          height: '100dvh',
          maxHeight: '100dvh',
          maxWidth: 'min(400px, 100vw)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Ask the advisor"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">Ask the advisor</div>
              <div className="truncate text-xs text-slate-500">Talk to your report</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close chat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Seeds (visible only before the first message is sent) */}
        {messages.length === 0 && seeds && seeds.length > 0 && (
          <div className="shrink-0 border-b border-slate-200/70 bg-slate-50/50 px-4 py-3">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
              Suggested
            </div>
            <div className="flex flex-wrap gap-1.5">
              {seeds.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={streaming}
                  onClick={() => sendPrompt(s.prompt)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  title={s.prompt}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.length === 0 && seeds === null && !seedsError && (
          <div className="flex items-center gap-2 border-b border-slate-200/70 px-4 py-3 text-xs text-slate-500">
            <Spinner className="size-3.5 text-emerald-600" /> Loading seed questions…
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="mt-6 text-left">
              <p className="text-sm leading-relaxed text-slate-500">
                Ask anything about this report — strategy, risks, timeline, compliance.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1
                const showCaret = m.role === 'assistant' && isLast && streaming
                return (
                  <MessageBubble key={i} message={m} showCaret={showCaret} />
                )
              })}
              {messageError && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-inset ring-red-200">
                  {messageError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Network error banner */}
        {networkError && (
          <div className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <p className="mb-2">{networkError}</p>
            <Button icon={RefreshCw} onClick={retry} variant="secondary">
              Retry
            </Button>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t border-slate-200 bg-white p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={streaming}
              rows={2}
              placeholder={streaming ? 'Advisor is thinking…' : 'Ask about this report… (Enter sends, Shift+Enter = newline)'}
              className="min-h-[52px] flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 disabled:bg-slate-50"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={streaming || !input.trim()}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
            {providerLabel(provider)}
          </p>
        </div>
      </div>
    </>
  )
}

function MessageBubble({ message, showCaret }: { message: ChatMessage; showCaret: boolean }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 px-3.5 py-2 text-sm leading-relaxed text-white">
          {message.content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2 text-sm leading-relaxed text-slate-800">
        {message.content ? (
          <div className="cc-chat-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : showCaret ? (
          <span className="text-slate-400">
            <span className="inline-block animate-pulse">▍</span>
          </span>
        ) : (
          <span className="italic text-slate-400">(no response)</span>
        )}
        {showCaret && message.content && (
          <span className="ml-0.5 inline-block animate-pulse text-emerald-600">▍</span>
        )}
      </div>
    </div>
  )
}
