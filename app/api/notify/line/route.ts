import { requireAuth } from "@/lib/auth/helpers"

export async function POST(request: Request) {
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx

  const body = await request.json().catch(() => null)
  const { token, meetingId, summary } = body ?? {}

  if (!token || typeof token !== "string") {
    return Response.json({ error: "LINE Notify token is required" }, { status: 400 })
  }

  const message = summary
    ? `\n📋 LEDGIO AI — สรุปประชุม\n\n${summary.slice(0, 900)}`
    : `\n📋 LEDGIO AI — ประชุมเสร็จแล้ว\nMeeting: ${meetingId ?? "N/A"}`

  try {
    const res = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ message }),
    })

    if (!res.ok) {
      const text = await res.text()
      return Response.json({ error: `LINE API error: ${text}` }, { status: 502 })
    }

    return Response.json({ data: { sent: true } })
  } catch (err) {
    return Response.json({ error: "Failed to send LINE notification" }, { status: 500 })
  }
}
