import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserWorkspaceRole } from "@/lib/db/queries/workspaces"
import { getMemoryFactsByWorkspace, upsertMemoryFact } from "@/lib/db/queries/memory"

const PROFILE_CATEGORY = "workspace_profile"

const PROFILE_FIELDS = [
  "companyName",
  "taxId",
  "businessType",
  "fiscalYear",
  "accountingStandard",
  "policyNotes",
] as const

type ProfileField = (typeof PROFILE_FIELDS)[number]

type WorkspaceProfile = Record<ProfileField, string>

function emptyProfile(): WorkspaceProfile {
  return {
    companyName: "",
    taxId: "",
    businessType: "",
    fiscalYear: "",
    accountingStandard: "",
    policyNotes: "",
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const facts = await getMemoryFactsByWorkspace(id, {
    category: PROFILE_CATEGORY,
    limit: 100,
  })
  const profile = emptyProfile()
  for (const fact of facts) {
    if (PROFILE_FIELDS.includes(fact.key as ProfileField)) {
      profile[fact.key as ProfileField] = fact.value
    }
  }

  return NextResponse.json({ data: profile })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = await getUserWorkspaceRole(session.user.id, id)
  if (!role || !["owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 })
  }

  const profile = emptyProfile()
  for (const field of PROFILE_FIELDS) {
    const value = (body as Record<string, unknown>)[field]
    profile[field] = typeof value === "string" ? value.trim().slice(0, 5000) : ""
    await upsertMemoryFact({
      workspaceId: id,
      key: field,
      value: profile[field],
      category: PROFILE_CATEGORY,
      source: "workspace_profile",
      confidence: 100,
    })
  }

  return NextResponse.json({ data: profile })
}
