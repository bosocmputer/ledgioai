/**
 * Quick Ask Mode — Single agent, instant streaming response
 * < 10 seconds, simplest mode
 */

import type { agents } from "@/lib/db/schema"
import type { MeetingContext } from "../context"
import type { SSESender } from "../sse"
import { createMastraAgent } from "@/lib/mastra"
import { buildSystemPrompt, buildQuickAskMessage } from "../prompts"

type AgentRow = typeof agents.$inferSelect

export interface QuickAskResult {
  content: string
  tokensUsed: number
}

export async function runQuickAsk(
  agentRow: AgentRow,
  question: string,
  context: MeetingContext,
  send: SSESender,
): Promise<QuickAskResult> {
  const systemPrompt = buildSystemPrompt(agentRow, context)
  const mastraAgent = createMastraAgent(agentRow, systemPrompt)

  send("agent_start", {
    agentId: agentRow.id,
    name: agentRow.name,
    emoji: agentRow.emoji,
  })

  const userMessage = buildQuickAskMessage(question)
  const result = await mastraAgent.stream([{ role: "user", content: userMessage }])

  let fullContent = ""

  for await (const chunk of result.textStream) {
    fullContent += chunk
    send("chunk", { agentId: agentRow.id, content: chunk })
  }

  // Get full output for token usage
  const output = await result.getFullOutput()
  const tokensUsed = output.usage?.totalTokens ?? 0

  send("message", {
    agentId: agentRow.id,
    phase: "quick_answer",
    content: fullContent,
    tokensUsed,
  })

  send("agent_done", { agentId: agentRow.id, tokensUsed })

  return { content: fullContent, tokensUsed }
}
