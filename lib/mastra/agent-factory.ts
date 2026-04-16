/**
 * Mastra Agent Factory
 * Convert DB agent rows → Mastra Agent instances
 */

import { Agent } from "@mastra/core/agent"
import type { agents } from "@/lib/db/schema"
import { buildModelConfig } from "./model-builder"

type AgentRow = typeof agents.$inferSelect

/**
 * Create a Mastra Agent from a DB agent row + dynamic system prompt
 */
export function createMastraAgent(
  agentRow: AgentRow,
  systemPrompt: string,
): Agent {
  const model = buildModelConfig(agentRow)

  return new Agent({
    name: agentRow.name,
    instructions: systemPrompt,
    model,
  })
}
