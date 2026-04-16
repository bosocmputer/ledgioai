/**
 * SSE (Server-Sent Events) types and helpers for meeting streaming
 */

// ── SSE Event Types ────────────────────────────────────

export type SSEEvent =
  | { event: "session"; data: { meetingId: string; mode: string } }
  | { event: "status"; data: { message: string } }
  | { event: "phase"; data: { phase: number; label: string } }
  | { event: "agent_start"; data: { agentId: string; name: string; emoji: string; isChairman?: boolean } }
  | { event: "chunk"; data: { agentId: string; content: string } }
  | { event: "message"; data: { agentId: string; phase: string; content: string; tokensUsed?: number } }
  | { event: "agent_done"; data: { agentId: string; tokensUsed?: number } }
  | { event: "clarification"; data: { questions: string[] } }
  | { event: "memory_update"; data: { facts: Array<{ key: string; value: string; category: string }> } }
  | { event: "error"; data: { message: string } }
  | { event: "done"; data: { meetingId: string; totalTokens: number } }

export type SSESender = (event: string, data: unknown) => void

// ── SSE Stream Factory ─────────────────────────────────

export function createSSEStream(
  handler: (send: SSESender) => Promise<void>,
): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send: SSESender = (event, data) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          // Controller may be closed
        }
      }

      try {
        await handler(send)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Meeting failed"
        send("error", { message })
      } finally {
        try {
          controller.close()
        } catch {
          // Already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
