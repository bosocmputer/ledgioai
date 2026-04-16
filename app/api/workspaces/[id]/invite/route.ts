import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { invitation } from "@/lib/db/schema"
import { getUserWorkspaceRole } from "@/lib/db/queries/workspaces"
import { inviteMemberSchema, parseBody } from "@/lib/validations"
import { rateLimitByUser } from "@/lib/rate-limit"

// POST /api/workspaces/[id]/invite — Invite member by email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only owner/admin can invite
  const role = await getUserWorkspaceRole(session.user.id, id)
  if (!role || !["owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const rl = await rateLimitByUser(session.user.id, "mutation")
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 })
  }
  const parsed = parseBody(inviteMemberSchema, body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { email, role: inviteRole } = parsed.data

  await db.insert(invitation).values({
    id: crypto.randomUUID(),
    organizationId: id,
    email: email.toLowerCase().trim(),
    role: inviteRole || "member",
    status: "pending",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    inviterId: session.user.id,
  })

  return NextResponse.json({ ok: true })
}
