import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listUserWorkspaces, countUserWorkspaces } from "@/lib/db/queries/workspaces"

// GET /api/workspaces — List user's workspaces
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const workspaces = await listUserWorkspaces(session.user.id)

  return NextResponse.json({ data: workspaces })
}

// POST /api/workspaces — Create a new workspace (via Better Auth client)
// Note: Workspace creation is handled by Better Auth's organization plugin
// through authClient.organization.create() on the client side.
// This endpoint exists only for the workspace limit check.
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const count = await countUserWorkspaces(session.user.id)
  if (count >= 10) {
    return NextResponse.json(
      { error: "สร้าง Workspace ได้สูงสุด 10 รายการ" },
      { status: 400 }
    )
  }

  // Delegate to Better Auth
  return NextResponse.json({ canCreate: true })
}
