import { requireAuth } from "@/lib/auth/helpers"

export async function POST(request: Request) {
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx

  const body = await request.json().catch(() => null)
  const { url, meetingId, summary, question } = body ?? {}

  if (!url || typeof url !== "string") {
    return Response.json({ error: "Webhook URL is required" }, { status: 400 })
  }

  // Validate URL format
  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return Response.json({ error: "URL must be http or https" }, { status: 400 })
    }
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 })
  }

  const payload = {
    source: "ledgio-ai",
    event: "meeting_completed",
    meetingId: meetingId ?? null,
    question: question ?? null,
    summary: summary ?? null,
    timestamp: new Date().toISOString(),
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    })

    return Response.json({ data: { sent: true, status: res.status } })
  } catch {
    return Response.json({ error: "Webhook delivery failed" }, { status: 502 })
  }
}
