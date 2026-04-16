"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Send, Loader2 } from "lucide-react"

interface Props {
  agentId: string
  agentName: string
  agentEmoji: string
  onClose: () => void
}

export function AgentPreviewModal({ agentId, agentName, agentEmoji, onClose }: Props) {
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([])
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    return () => { abortRef.current?.abort() }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const handleSend = useCallback(async () => {
    const q = question.trim()
    if (!q || streaming) return

    setMessages((prev) => [...prev, { role: "user", text: q }])
    setQuestion("")
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/meetings/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "quick_ask",
          agentIds: [agentId],
          question: q,
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, { role: "agent", text: "❌ เกิดข้อผิดพลาด กรุณาลองใหม่" }])
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let agentText = ""

      // Add empty agent message to stream into
      setMessages((prev) => [...prev, { role: "agent", text: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === "chunk" && data.text) {
                agentText += data.text
                setMessages((prev) => {
                  const copy = [...prev]
                  copy[copy.length - 1] = { role: "agent", text: agentText }
                  return copy
                })
              } else if (data.type === "message" && data.content) {
                agentText += data.content
                setMessages((prev) => {
                  const copy = [...prev]
                  copy[copy.length - 1] = { role: "agent", text: agentText }
                  return copy
                })
              } else if (data.type === "error") {
                agentText += `\n❌ ${data.message || "Error"}`
                setMessages((prev) => {
                  const copy = [...prev]
                  copy[copy.length - 1] = { role: "agent", text: agentText }
                  return copy
                })
              }
            } catch {
              // skip non-JSON lines
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [...prev, { role: "agent", text: "❌ เชื่อมต่อไม่ได้" }])
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [question, streaming, agentId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-[70vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{agentEmoji}</span>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">ทดสอบ {agentName}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Quick Ask — ถามอะไรก็ได้</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-gray-400">
                ถามคำถามเพื่อทดสอบ Agent
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                }`}
              >
                {msg.text || (streaming && i === messages.length - 1 ? "..." : "")}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend() }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="พิมพ์คำถาม..."
              disabled={streaming}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={streaming || !question.trim()}
              className="rounded-lg bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
