/**
 * Full Board Meeting — 5-phase orchestration
 * ~2-5 minutes, most thorough mode
 *
 * Phase 0: Clarification (Chairman asks follow-up questions)
 * Phase 1: Analysis (all agents analyze in parallel)
 * Phase 2: Findings (each agent presents, ordered by seniority)
 * Phase 3: Discussion (agents read each other's findings, debate)
 * Phase 4: Synthesis (Chairman summarizes consensus)
 */

import type { agents } from "@/lib/db/schema"
import type { MeetingContext } from "../context"
import type { SSESender } from "../sse"
import { createMastraAgent } from "@/lib/mastra"
import {
  buildSystemPrompt,
  buildClarificationPrompt,
  buildAnalysisPrompt,
  buildFindingsPrompt,
  buildBoardDiscussionPrompt,
  buildSynthesisPrompt,
  detectChairman,
  sortBySeniority,
} from "../prompts"

type AgentRow = typeof agents.$inferSelect

export interface ClarificationAnswer {
  question: string
  answer: string
}

export interface FullBoardResult {
  phase: "waiting_clarification" | "completed"
  questions?: string[]
  finalAnswer?: string
  totalTokens: number
}

// ── Main Entry ─────────────────────────────────────────

export async function runFullBoard(
  agentRows: AgentRow[],
  question: string,
  context: MeetingContext,
  clarificationAnswers: ClarificationAnswer[] | null,
  send: SSESender,
): Promise<FullBoardResult> {
  const chairman = detectChairman(agentRows)
  const ordered = sortBySeniority(agentRows)
  let totalTokens = 0

  // ── Phase 0: Clarification ───────────────────────
  if (!clarificationAnswers) {
    send("phase", { phase: 0, label: "ถามคำถามเพิ่มเติม" })
    const questions = await runClarificationPhase(chairman, question, context, send)

    if (questions.length > 0) {
      send("clarification", { questions })
      return { phase: "waiting_clarification", questions, totalTokens }
    }
    // No questions needed — continue directly
  }

  // Build clarification context
  const clarificationText = clarificationAnswers
    ? clarificationAnswers.map((a) => `ถาม: ${a.question}\nตอบ: ${a.answer}`).join("\n\n")
    : ""

  // ── Phase 1: Parallel Analysis ───────────────────
  send("phase", { phase: 1, label: "วิเคราะห์" })
  send("status", { message: "ทุกคนกำลังวิเคราะห์..." })

  const analyses = await Promise.all(
    agentRows.map(async (agentRow) => {
      const systemPrompt = buildSystemPrompt(agentRow, context)
      const mastraAgent = createMastraAgent(agentRow, systemPrompt)

      send("agent_start", {
        agentId: agentRow.id,
        name: agentRow.name,
        emoji: agentRow.emoji,
        isChairman: agentRow.id === chairman.id,
      })

      const prompt = clarificationText
        ? `${buildAnalysisPrompt(question)}\n\n## ข้อมูลเพิ่มเติมจากผู้ถาม:\n${clarificationText}`
        : buildAnalysisPrompt(question)

      const result = await mastraAgent.generate([{ role: "user", content: prompt }])
      const tokensUsed = result.usage?.totalTokens ?? 0
      totalTokens += tokensUsed

      send("message", {
        agentId: agentRow.id,
        phase: "analysis",
        content: result.text,
        tokensUsed,
      })
      send("agent_done", { agentId: agentRow.id, tokensUsed })

      return { agent: agentRow, content: result.text, tokensUsed }
    }),
  )

  // ── Phase 2: Findings Presentation ───────────────
  send("phase", { phase: 2, label: "นำเสนอ" })
  send("status", { message: "กำลังนำเสนอผลวิเคราะห์..." })

  const findings: Array<{ agent: AgentRow; content: string; tokensUsed: number }> = []

  for (const agentRow of ordered) {
    const analysis = analyses.find((a) => a.agent.id === agentRow.id)
    if (!analysis) continue

    const systemPrompt = buildSystemPrompt(agentRow, context)
    const mastraAgent = createMastraAgent(agentRow, systemPrompt)

    send("agent_start", {
      agentId: agentRow.id,
      name: agentRow.name,
      emoji: agentRow.emoji,
      isChairman: agentRow.id === chairman.id,
    })

    const prompt = buildFindingsPrompt(question, analysis.content, agentRow)
    const result = await mastraAgent.generate([{ role: "user", content: prompt }])
    const tokensUsed = result.usage?.totalTokens ?? 0
    totalTokens += tokensUsed

    send("message", {
      agentId: agentRow.id,
      phase: "finding",
      content: result.text,
      tokensUsed,
    })
    send("agent_done", { agentId: agentRow.id, tokensUsed })

    findings.push({ agent: agentRow, content: result.text, tokensUsed })
  }

  // ── Phase 3: Discussion ──────────────────────────
  send("phase", { phase: 3, label: "ถกเถียง" })
  send("status", { message: "กำลังถกเถียง..." })

  const allFindings = findings
    .map((f) => `${f.agent.emoji} ${f.agent.name} (${f.agent.role}):\n${f.content}`)
    .join("\n\n---\n\n")

  const discussions: Array<{ agent: AgentRow; content: string; tokensUsed: number }> = []

  for (const agentRow of ordered) {
    const systemPrompt = buildSystemPrompt(agentRow, context)
    const mastraAgent = createMastraAgent(agentRow, systemPrompt)

    send("agent_start", {
      agentId: agentRow.id,
      name: agentRow.name,
      emoji: agentRow.emoji,
      isChairman: agentRow.id === chairman.id,
    })

    const prompt = buildBoardDiscussionPrompt(question, allFindings, agentRow)
    const result = await mastraAgent.generate([{ role: "user", content: prompt }])
    const tokensUsed = result.usage?.totalTokens ?? 0
    totalTokens += tokensUsed

    send("message", {
      agentId: agentRow.id,
      phase: "discussion",
      content: result.text,
      tokensUsed,
    })
    send("agent_done", { agentId: agentRow.id, tokensUsed })

    discussions.push({ agent: agentRow, content: result.text, tokensUsed })
  }

  // ── Phase 4: Synthesis (Chairman) ────────────────
  send("phase", { phase: 4, label: "สรุป" })
  send("status", { message: "ประธานกำลังสรุปมติ..." })

  const allDiscussions = [
    ...findings.map((f) => `[นำเสนอ] ${f.agent.emoji} ${f.agent.name}:\n${f.content}`),
    ...discussions.map((d) => `[ถกเถียง] ${d.agent.emoji} ${d.agent.name}:\n${d.content}`),
  ].join("\n\n---\n\n")

  const chairmanPrompt = buildSystemPrompt(chairman, context)
  const chairmanAgent = createMastraAgent(chairman, chairmanPrompt)

  send("agent_start", {
    agentId: chairman.id,
    name: chairman.name,
    emoji: chairman.emoji,
    isChairman: true,
  })

  // Stream the synthesis for better UX
  const synthesisResult = await chairmanAgent.stream([
    { role: "user", content: buildSynthesisPrompt(question, allDiscussions, clarificationText) },
  ])

  let finalAnswer = ""
  for await (const chunk of synthesisResult.textStream) {
    finalAnswer += chunk
    send("chunk", { agentId: chairman.id, content: chunk })
  }

  const synthesisOutput = await synthesisResult.getFullOutput()
  const synthTokens = synthesisOutput.usage?.totalTokens ?? 0
  totalTokens += synthTokens

  send("message", {
    agentId: chairman.id,
    phase: "synthesis",
    content: finalAnswer,
    tokensUsed: synthTokens,
  })
  send("agent_done", { agentId: chairman.id, tokensUsed: synthTokens })

  return { phase: "completed", finalAnswer, totalTokens }
}

// ── Phase 0: Clarification ─────────────────────────────

async function runClarificationPhase(
  chairman: AgentRow,
  question: string,
  context: MeetingContext,
  send: SSESender,
): Promise<string[]> {
  const systemPrompt = buildSystemPrompt(chairman, context)
  const mastraAgent = createMastraAgent(chairman, systemPrompt)

  send("agent_start", {
    agentId: chairman.id,
    name: chairman.name,
    emoji: chairman.emoji,
    isChairman: true,
  })

  const result = await mastraAgent.generate([
    { role: "user", content: buildClarificationPrompt(question) },
  ])

  send("agent_done", { agentId: chairman.id })

  // Parse JSON array from response
  try {
    const match = result.text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const questions = JSON.parse(match[0]) as string[]
    return Array.isArray(questions) ? questions.filter((q) => typeof q === "string") : []
  } catch {
    return []
  }
}
