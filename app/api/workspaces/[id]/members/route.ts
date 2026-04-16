import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserWorkspaceRole, getWorkspaceMembers } from "@/lib/db/queries/workspaces"

// GET /api/workspaces/[id]/members — List workspace members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = await getUserWorkspaceRole(session.user.id, id)
  if (!role) {
    return NextResponse.json({ error: "Workspace ไม่พบ" }, { status: 404 })
  }

  const members = await getWorkspaceMembers(id)

  return NextResponse.json({ data: members })
}
