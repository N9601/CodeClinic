// Ask-the-Advisor chat panel: floating button + slide-in SSE chat.
import { MessageSquare, RefreshCw, Send, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ApiError, fetchChatSeeds, streamChat } from '../../api'
import type { AssessmentReport, ChatMessage, ChatSeed } from '../../types'
import { SectionHeader } from '../brand/SectionHeader'
import { Button, cx, Spinner } from '../ui'

const STORAGE_PREFIX = 'cc-chat:'

function loadMessages(reportId: string): ChatMessage[] {
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

function saveMessages(reportId: string, messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + reportId, JSON.stringify(messages))
  } catch {
    /* ignore */
  }
}

export function ChatPanel({ report }: { report: AssessmentReport }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages(report.id))
  const [seeds, setSeeds] = useState<ChatSeed[] | null>(null)
  const [seedsError, setSeedsError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset state when the report id changes.
  useEffect(() => {
    setMessages(loadMessages(report.id))
    setSeeds(null)
    setSeedsError(null)
    setMessageError(null)
    setNetworkError(null)
    setStreaming(false)
    abortRef.current?.abort()
    abortRef.current = null
  }, [report.id])

  useEffect(() => {
    saveMessages(report.id, messages)
  }, [report.id, messages])

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
          className="no-print fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/40 ring-1 ring-inset ring-emerald-700/20 transition hover:bg-emerald-700"
          aria-label="Open the advisor chat"
        >
          <MessageSquare className="size-4" aria-hidden />
          Ask the advisor
        </button>
      )}

      {/* Panel */}
      <div
        className={cx(
          'no-print fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none',
        )}
        role="dialog"
        aria-label="Ask the advisor"
        aria-hidden={!open}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4">
          <SectionHeader
            size="sm"
            eyebrow="[ ASK THE ADVISOR ]"
            title="TALK TO YOUR REPORT"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
            aria-label="Close chat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Seeds */}
        {seeds && seeds.length > 0 && (
          <div className="shrink-0 border-b border-slate-100 bg-emerald-50/40 px-4 py-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Suggested questions</div>
            <div className="flex flex-wrap gap-1.5">
              {seeds.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={streaming}
                  onClick={() => sendPrompt(s.prompt)}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                  title={s.prompt}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {seeds === null && !seedsError && (
          <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500">
            <Spinner className="size-3.5 text-emerald-600" /> Loading seed questions…
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              Ask anything about this report — strategy, risks, timeline, compliance.
            </p>
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
              className="min-h-[52px] flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-50"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={streaming || !input.trim()}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function MessageBubble({ message, showCaret }: { message: ChatMessage; showCaret: boolean }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-600 px-3.5 py-2 text-sm leading-relaxed text-white shadow-sm">
          {message.content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2 text-sm leading-relaxed text-slate-800 shadow-sm">
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
