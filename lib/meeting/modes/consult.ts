/**
 * Consult Mode — 2-3 agents, parallel analysis + discussion
 * ~30-60 seconds
 */

import type { agents } from "@/lib/db/schema"
import type { MeetingContext } from "../context"
import type { SSESender } from "../sse"
import { createMastraAgent } from "@/lib/mastra"
import {
  buildSystemPrompt,
  buildAnalysisPrompt,
  buildDiscussionPrompt,
} from "../prompts"

type AgentRow = typeof agents.$inferSelect

interface AgentAnalysis {
  agent: AgentRow
  content: string
  tokensUsed: number
}

export interface ConsultResult {
  analyses: Array<{ agentId: string; content: string; tokensUsed: number }>
  discussions: Array<{ agentId: string; content: string; tokensUsed: number }>
  totalTokens: number
}

export async function runConsult(
  agentRows: AgentRow[],
  question: string,
  context: MeetingContext,
  send: SSESender,
): Promise<ConsultResult> {
  let totalTokens = 0

  // ── Phase 1: Parallel Analysis ─────────────────────
  send("status", { message: "กำลังวิเคราะห์..." })

  const analyses: AgentAnalysis[] = await Promise.all(
    agentRows.map(async (agentRow) => {
      const systemPrompt = buildSystemPrompt(agentRow, context)
      const mastraAgent = createMastraAgent(agentRow, systemPrompt)

      send("agent_start", {
        agentId: agentRow.id,
        name: agentRow.name,
        emoji: agentRow.emoji,
      })

      const userMessage = buildAnalysisPrompt(question)
      const result = await mastraAgent.generate([{ role: "user", content: userMessage }])

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

  // ── Phase 2: Discussion (each reads others' analysis) ─
  send("status", { message: "กำลังถกเถียง..." })

  const discussions: Array<{ agentId: string; content: string; tokensUsed: number }> = []

  for (const analysis of analyses) {
    const agentRow = analysis.agent
    const systemPrompt = buildSystemPrompt(agentRow, context)
    const mastraAgent = createMastraAgent(agentRow, systemPrompt)

    // Build others' context (exclude self)
    const othersContext = analyses
      .filter((a) => a.agent.id !== agentRow.id)
      .map((a) => `${a.agent.emoji} ${a.agent.name}:\n${a.content}`)
      .join("\n\n")

    send("agent_start", {
      agentId: agentRow.id,
      name: agentRow.name,
      emoji: agentRow.emoji,
    })

    const userMessage = buildDiscussionPrompt(question, analysis.content, othersContext, agentRow)
    const result = await mastraAgent.generate([{ role: "user", content: userMessage }])

    const tokensUsed = result.usage?.totalTokens ?? 0
    totalTokens += tokensUsed

    send("message", {
      agentId: agentRow.id,
      phase: "discussion",
      content: result.text,
      tokensUsed,
    })
    send("agent_done", { agentId: agentRow.id, tokensUsed })

    discussions.push({ agentId: agentRow.id, content: result.text, tokensUsed })
  }

  return {
    analyses: analyses.map((a) => ({
      agentId: a.agent.id,
      content: a.content,
      tokensUsed: a.tokensUsed,
    })),
    discussions,
    totalTokens,
  }
}
