"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useWorkspace } from "@/components/providers/workspace-provider"
import {
  MessageCircle,
  Users,
  Building2,
  Send,
  Paperclip,
  Loader2,
  Bot,
  ChevronDown,
  X,
  Copy,
  Check,
  Download,
  Share2,
} from "lucide-react"
import { VoiceInput } from "@/components/meeting/voice-input"

// ── Types ──────────────────────────────────────────────

type MeetingMode = "quick_ask" | "consult" | "full_board"

interface Agent {
  id: string
  name: string
  emoji: string
  role: string
}

interface Team {
  id: string
  name: string
  emoji: string
  agents: Agent[]
}

interface ChatMessage {
  id: string
  agentId: string
  agentName: string
  agentEmoji: string
  phase: string
  content: string
  tokensUsed?: number
  isStreaming?: boolean
}

interface SSEData {
  meetingId?: string
  mode?: string
  message?: string
  phase?: number
  label?: string
  agentId?: string
  name?: string
  emoji?: string
  isChairman?: boolean
  content?: string
  tokensUsed?: number
  totalTokens?: number
  questions?: string[]
  facts?: Array<{ key: string; value: string; category: string }>
}

// ── Mode Config ────────────────────────────────────────

const MODES: Array<{
  id: MeetingMode
  label: string
  icon: React.ReactNode
  description: string
  minAgents: number
}> = [
  {
    id: "quick_ask",
    label: "Quick Ask",
    icon: <MessageCircle className="w-5 h-5" />,
    description: "ถามเร็ว ตอบเร็ว (1 agent)",
    minAgents: 1,
  },
  {
    id: "consult",
    label: "Consult",
    icon: <Users className="w-5 h-5" />,
    description: "2-3 คนถกเถียง (30-60 วิ)",
    minAgents: 2,
  },
  {
    id: "full_board",
    label: "Full Board",
    icon: <Building2 className="w-5 h-5" />,
    description: "ประชุมเต็มรูปแบบ 5 ขั้นตอน",
    minAgents: 2,
  },
]

// ── Main Component ─────────────────────────────────────

export default function MeetingPage() {
  const { activeWorkspace } = useWorkspace()

  // Setup state
  const [agents, setAgents] = useState<Agent[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedMode, setSelectedMode] = useState<MeetingMode>("quick_ask")
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  // Meeting state
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [meetingId, setMeetingId] = useState<string | null>(null)
  const [statusText, setStatusText] = useState("")
  const [currentPhase, setCurrentPhase] = useState<string | null>(null)
  const [totalTokens, setTotalTokens] = useState(0)
  const [language, setLanguage] = useState("th")

  // Clarification state
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([])
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<number, string>>({})
  const [showClarification, setShowClarification] = useState(false)

  // File upload
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Load agents & teams ────────────────────────────
  useEffect(() => {
    if (!activeWorkspace) return
    Promise.all([
      fetch("/api/agents").then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ]).then(([agentsRes, teamsRes]) => {
      setAgents(agentsRes.data ?? [])
      setTeams(teamsRes.data ?? [])
    })
  }, [activeWorkspace])

  // ── Auto-scroll ────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Toggle agent selection ─────────────────────────
  const toggleAgent = useCallback((agentId: string) => {
    setSelectedTeamId(null)
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId],
    )
  }, [])

  const selectTeam = useCallback((team: Team) => {
    setSelectedTeamId(team.id)
    setSelectedAgentIds(team.agents.map((a) => a.id))
  }, [])

  // ── Get selected agent count ───────────────────────
  const selectedCount = selectedAgentIds.length
  const currentMode = MODES.find((m) => m.id === selectedMode)!
  const canStart = question.trim() && selectedCount >= currentMode.minAgents && !isRunning

  // ── Start Meeting ──────────────────────────────────
  const startMeeting = useCallback(
    async (extraClarification?: Array<{ question: string; answer: string }>) => {
      if (!canStart && !extraClarification) return

      setIsRunning(true)
      setMessages([])
      setStatusText("กำลังเริ่มการประชุม...")
      setCurrentPhase(null)
      setTotalTokens(0)
      setShowClarification(false)

      const formData = new FormData()
      formData.append("question", question.trim())
      formData.append("mode", selectedMode)
      formData.append("language", language)

      if (selectedTeamId) {
        formData.append("teamId", selectedTeamId)
      }
      formData.append("agentIds", JSON.stringify(selectedAgentIds))

      if (extraClarification) {
        formData.append("clarificationAnswers", JSON.stringify(extraClarification))
      }

      for (const file of files) {
        formData.append("files", file)
      }

      try {
        const res = await fetch("/api/meetings/stream", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed" }))
          setStatusText(`Error: ${err.error}`)
          setIsRunning(false)
          return
        }

        // Read SSE stream
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          let eventType = ""
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data: SSEData = JSON.parse(line.slice(6))
                handleSSEEvent(eventType, data)
              } catch {
                // Skip malformed
              }
              eventType = ""
            }
          }
        }
      } catch (err) {
        setStatusText(`Error: ${err instanceof Error ? err.message : "Connection failed"}`)
      } finally {
        setIsRunning(false)
      }
    },
    [canStart, question, selectedMode, selectedTeamId, selectedAgentIds, files],
  )

  // ── SSE Event Handler ──────────────────────────────
  const handleSSEEvent = useCallback((event: string, data: SSEData) => {
    switch (event) {
      case "session":
        setMeetingId(data.meetingId ?? null)
        break

      case "status":
        setStatusText(data.message ?? "")
        break

      case "phase":
        setCurrentPhase(`Phase ${data.phase}: ${data.label}`)
        setStatusText(data.label ?? "")
        break

      case "agent_start":
        // Add a placeholder message for streaming
        setMessages((prev) => [
          ...prev,
          {
            id: `${data.agentId}-${Date.now()}`,
            agentId: data.agentId!,
            agentName: data.name!,
            agentEmoji: data.emoji!,
            phase: "",
            content: "",
            isStreaming: true,
          },
        ])
        break

      case "chunk":
        // Append to the last message from this agent
        setMessages((prev) => {
          const idx = prev.findLastIndex(
            (m) => m.agentId === data.agentId && m.isStreaming,
          )
          if (idx === -1) return prev
          const updated = [...prev]
          updated[idx] = {
            ...updated[idx],
            content: updated[idx].content + (data.content ?? ""),
          }
          return updated
        })
        break

      case "message":
        // Replace or add the message
        setMessages((prev) => {
          const idx = prev.findLastIndex(
            (m) => m.agentId === data.agentId && m.isStreaming,
          )
          const msg: ChatMessage = {
            id: `${data.agentId}-${data.phase}-${Date.now()}`,
            agentId: data.agentId!,
            agentName: prev.find((m) => m.agentId === data.agentId)?.agentName ?? "",
            agentEmoji: prev.find((m) => m.agentId === data.agentId)?.agentEmoji ?? "",
            phase: String(data.phase ?? ""),
            content: data.content ?? "",
            tokensUsed: data.tokensUsed,
            isStreaming: false,
          }
          if (idx !== -1) {
            const updated = [...prev]
            updated[idx] = msg
            return updated
          }
          return [...prev, msg]
        })
        break

      case "agent_done":
        // Mark last streaming message as done
        setMessages((prev) =>
          prev.map((m) =>
            m.agentId === data.agentId && m.isStreaming
              ? { ...m, isStreaming: false, tokensUsed: data.tokensUsed }
              : m,
          ),
        )
        break

      case "clarification":
        setClarificationQuestions(data.questions ?? [])
        setClarificationAnswers({})
        setShowClarification(true)
        setIsRunning(false)
        break

      case "memory_update":
        if (data.facts && data.facts.length > 0) {
          setStatusText(`จดจำข้อเท็จจริงใหม่ ${data.facts.length} รายการ`)
        }
        break

      case "error":
        setStatusText(`Error: ${data.message}`)
        break

      case "done":
        setTotalTokens(data.totalTokens ?? 0)
        setStatusText("ประชุมเสร็จสิ้น")
        setIsRunning(false)
        break
    }
  }, [])

  // ── Submit Clarification ───────────────────────────
  const submitClarification = useCallback(() => {
    const answers = clarificationQuestions.map((q, i) => ({
      question: q,
      answer: clarificationAnswers[i] ?? "",
    }))
    startMeeting(answers)
  }, [clarificationQuestions, clarificationAnswers, startMeeting])

  // ── Phase label style ──────────────────────────────
  const phaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      quick_answer: "💬 คำตอบ",
      analysis: "🔍 วิเคราะห์",
      finding: "📋 นำเสนอ",
      discussion: "💬 ถกเถียง",
      synthesis: "📝 สรุปมติ",
    }
    return labels[phase] ?? phase
  }

  // ── Render ─────────────────────────────────────────

  // Copy button state
  const [copiedId, setCopiedId] = useState<string | null>(null)
  function copyMessage(id: string, content: string) {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* ── Sidebar: Agent/Team Selector ─── */}
      <div className="w-72 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 p-4 overflow-y-auto flex-shrink-0">
        {/* Mode Selector */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">โหมดประชุม</h3>
          <div className="space-y-2">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedMode === mode.id
                    ? "bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300"
                    : "bg-white dark:bg-gray-900 hover:bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
              >
                {mode.icon}
                <div className="text-left">
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{mode.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Language Selector */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">ภาษาตอบกลับ</h3>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="th">🇹🇭 ไทย</option>
            <option value="en">🇺🇸 English</option>
            <option value="zh">🇨🇳 中文</option>
            <option value="ja">🇯🇵 日本語</option>
          </select>
        </div>

        {/* Team Selection */}
        {teams.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">ทีม</h3>
            <div className="space-y-1">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => selectTeam(team)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTeamId === team.id
                      ? "bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300"
                      : "bg-white dark:bg-gray-900 hover:bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <span className="text-lg">{team.emoji}</span>
                  <div className="text-left">
                    <div className="font-medium">{team.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{team.agents.length} agents</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Agent Selection */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            ผู้เชี่ยวชาญ ({selectedCount} selected)
          </h3>
          <div className="space-y-1">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => toggleAgent(agent.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedAgentIds.includes(agent.id)
                    ? "bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300"
                    : "bg-white dark:bg-gray-900 hover:bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <span className="text-lg">{agent.emoji}</span>
                <div className="text-left">
                  <div className="font-medium">{agent.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{agent.role}</div>
                </div>
              </button>
            ))}
            {agents.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                ยังไม่มีผู้เชี่ยวชาญ
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Chat Area ─── */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-900">
          <div>
            <h1 className="text-lg font-semibold">ห้องประชุม</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {currentPhase && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                  {currentPhase}
                </span>
              )}
              {statusText && <span>{statusText}</span>}
              {totalTokens > 0 && (
                <span className="text-xs text-gray-400">({totalTokens.toLocaleString()} tokens)</span>
              )}
            </div>
          </div>
          {isRunning && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
          {!isRunning && meetingId && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open(`/api/meetings/${meetingId}/report`, "_blank")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Download className="w-4 h-4" /> รายงาน
              </button>
              <button
                onClick={async () => {
                  const res = await fetch(`/api/meetings/${meetingId}/share`, { method: "POST" })
                  if (res.ok) {
                    const json = await res.json()
                    const url = `${window.location.origin}/share/${json.data.token}`
                    await navigator.clipboard.writeText(url)
                    alert("คัดลอกลิงก์แชร์แล้ว!")
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Share2 className="w-4 h-4" /> แชร์
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && !isRunning && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <Bot className="w-16 h-16" />
              <div className="text-center">
                <p className="text-lg font-medium">พร้อมเริ่มประชุม</p>
                <p className="text-sm">เลือกผู้เชี่ยวชาญ → พิมพ์คำถาม → กด Enter</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3 group">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl">
                {msg.agentEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{msg.agentName}</span>
                  {msg.phase && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                      {phaseLabel(msg.phase)}
                    </span>
                  )}
                  {msg.tokensUsed !== undefined && msg.tokensUsed > 0 && (
                    <span className="text-xs text-gray-400">{msg.tokensUsed} tokens</span>
                  )}
                  {!msg.isStreaming && msg.content && (
                    <button
                      onClick={() => copyMessage(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 rounded transition-opacity"
                      title="คัดลอก"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
                <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Clarification Questions */}
          {showClarification && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 rounded-lg p-4">
              <h3 className="font-medium text-amber-800 mb-3">
                ✋ ประธานต้องการข้อมูลเพิ่มเติมก่อนเริ่มประชุม
              </h3>
              <div className="space-y-3">
                {clarificationQuestions.map((q, i) => (
                  <div key={i}>
                    <label className="block text-sm font-medium text-amber-900 mb-1">
                      {i + 1}. {q}
                    </label>
                    <input
                      type="text"
                      value={clarificationAnswers[i] ?? ""}
                      onChange={(e) =>
                        setClarificationAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                      }
                      className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="พิมพ์คำตอบ..."
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={submitClarification}
                className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
              >
                ส่งคำตอบ & เริ่มประชุม
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
          {/* Attached files */}
          {files.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {files.map((file, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400"
                >
                  📎 {file.name}
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 rounded-lg"
              title="แนบเอกสาร"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <VoiceInput
              onTranscript={(text) => setQuestion((prev) => prev ? prev + " " + text : text)}
              disabled={isRunning}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.docx,.csv,.txt,.json,.md"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
                }
              }}
            />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && canStart) {
                  e.preventDefault()
                  startMeeting()
                }
              }}
              placeholder={
                selectedCount === 0
                  ? "เลือกผู้เชี่ยวชาญก่อน..."
                  : "พิมพ์คำถาม... (Enter เพื่อเริ่มประชุม)"
              }
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 dark:bg-gray-950"
              disabled={isRunning}
            />
            <button
              onClick={() => startMeeting()}
              disabled={!canStart}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              เริ่มประชุม
            </button>
          </div>

          <div className="mt-1 text-xs text-gray-400 flex items-center gap-2">
            <span>
              {currentMode.label} • {selectedCount} agent{selectedCount !== 1 ? "s" : ""}
            </span>
            {selectedCount < currentMode.minAgents && (
              <span className="text-red-400">
                (ต้องเลือกอย่างน้อย {currentMode.minAgents} agent)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
