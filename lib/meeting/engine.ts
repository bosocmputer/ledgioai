/**
 * Meeting Engine — Main orchestrator
 * Routes to correct mode, handles DB persistence, stats, memory extraction
 */

import type { agents } from "@/lib/db/schema"
import type { SSESender } from "./sse"
import type { FileContext } from "./context"
import type { ClarificationAnswer } from "./modes/full-board"
import { buildMeetingContext } from "./context"
import { runQuickAsk } from "./modes/quick-ask"
import { runConsult } from "./modes/consult"
import { runFullBoard } from "./modes/full-board"
import { extractMemoryFacts } from "./memory"
import { detectChairman } from "./prompts"
import {
  createMeeting,
  updateMeeting,
  createMeetingMessage,
  updateAgentStats,
} from "@/lib/db/queries/meetings"

type AgentRow = typeof agents.$inferSelect

export type MeetingMode = "quick_ask" | "consult" | "full_board"

export interface MeetingConfig {
  workspaceId: string
  userId: string
  question: string
  mode: MeetingMode
  agentRows: AgentRow[]
  teamId?: string
  fileContexts?: FileContext[]
  clarificationAnswers?: ClarificationAnswer[]
}

/**
 * Run a complete meeting — creates DB record, runs mode, saves messages + stats
 */
export async function runMeeting(
  config: MeetingConfig,
  send: SSESender,
): Promise<void> {
  const {
    workspaceId,
    userId,
    question,
    mode,
    agentRows,
    teamId,
    fileContexts = [],
    clarificationAnswers,
  } = config

  // Create meeting record
  const meeting = await createMeeting({
    workspaceId,
    userId,
    question,
    mode,
    status: "running",
    agentIds: JSON.stringify(agentRows.map((a) => a.id)),
    teamId: teamId || null,
    fileContexts: fileContexts.length > 0 ? JSON.stringify(fileContexts.map((f) => f.filename)) : null,
  })

  send("session", { meetingId: meeting.id, mode })

  try {
    // Build context (memory facts, workspace info, etc.)
    const context = await buildMeetingContext(workspaceId, fileContexts)
    let totalTokens = 0
    let finalAnswer: string | undefined

    // ── Route to mode ─────────────────────────────
    switch (mode) {
      case "quick_ask": {
        const result = await runQuickAsk(agentRows[0], question, context, send)
        totalTokens = result.tokensUsed
        finalAnswer = result.content

        // Save message
        await createMeetingMessage({
          meetingId: meeting.id,
          workspaceId,
          agentId: agentRows[0].id,
          agentName: agentRows[0].name,
          agentEmoji: agentRows[0].emoji,
          phase: "quick_answer",
          content: result.content,
          tokensUsed: result.tokensUsed,
        })

        // Update agent stats
        await updateAgentStats(agentRows[0].id, workspaceId, 0, result.tokensUsed)
        break
      }

      case "consult": {
        const result = await runConsult(agentRows, question, context, send)
        totalTokens = result.totalTokens

        // Save messages
        for (const analysis of result.analyses) {
          const agentRow = agentRows.find((a) => a.id === analysis.agentId)
          if (!agentRow) continue
          await createMeetingMessage({
            meetingId: meeting.id,
            workspaceId,
            agentId: agentRow.id,
            agentName: agentRow.name,
            agentEmoji: agentRow.emoji,
            phase: "analysis",
            content: analysis.content,
            tokensUsed: analysis.tokensUsed,
          })
          await updateAgentStats(agentRow.id, workspaceId, 0, analysis.tokensUsed)
        }
        for (const disc of result.discussions) {
          const agentRow = agentRows.find((a) => a.id === disc.agentId)
          if (!agentRow) continue
          await createMeetingMessage({
            meetingId: meeting.id,
            workspaceId,
            agentId: agentRow.id,
            agentName: agentRow.name,
            agentEmoji: agentRow.emoji,
            phase: "discussion",
            content: disc.content,
            tokensUsed: disc.tokensUsed,
          })
          await updateAgentStats(agentRow.id, workspaceId, 0, disc.tokensUsed)
        }
        break
      }

      case "full_board": {
        const result = await runFullBoard(
          agentRows,
          question,
          context,
          clarificationAnswers ?? null,
          send,
        )
        totalTokens = result.totalTokens
        finalAnswer = result.finalAnswer

        if (result.phase === "waiting_clarification") {
          // Don't mark as completed — waiting for user answers
          await updateMeeting(meeting.id, workspaceId, {
            status: "running",
            metadata: JSON.stringify({ waitingClarification: true, questions: result.questions }),
          })
          send("done", { meetingId: meeting.id, totalTokens: 0 })
          return
        }

        // Memory extraction (only for completed full board)
        if (finalAnswer) {
          const chairman = detectChairman(agentRows)
          const facts = await extractMemoryFacts(finalAnswer, chairman, workspaceId, meeting.id)
          if (facts.length > 0) {
            send("memory_update", { facts })
          }
        }
        break
      }
    }

    // Mark meeting as completed
    await updateMeeting(meeting.id, workspaceId, {
      status: "completed",
      finalAnswer,
      totalTokens,
      completedAt: new Date(),
    })

    send("done", { meetingId: meeting.id, totalTokens })
  } catch (err) {
    // Mark meeting as error
    await updateMeeting(meeting.id, workspaceId, {
      status: "error",
      metadata: JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
    })
    throw err
  }
}
