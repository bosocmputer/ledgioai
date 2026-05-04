# LEDGIO AI — Auth System (Better Auth)

> Current auth notes. Updated May 2026 from `lib/auth/**`, `proxy.ts`, and the live schema.

---

## ทำไมถึงเปลี่ยนจาก NextAuth v5 → Better Auth

| Feature | NextAuth v5 | Better Auth |
|---------|------------|-------------|
| Multi-tenant Organizations | ต้องเขียนเอง | Built-in plugin |
| RBAC (roles/permissions) | ต้องเขียนเอง | Built-in plugin |
| 2FA / TOTP | ไม่มี | Built-in |
| Passkeys | ไม่มี | Built-in |
| Email verification | ต้อง config เอง | Built-in |
| Drizzle adapter | มี | มี (joins support) |
| Type safety | ปานกลาง | Excellent — full inference |
| Schema generation | เขียนเอง | CLI auto-generate |

**Better Auth Organizations** = ระบบ Multi-tenant ที่เราต้องการโดยตรง

- `organization` table = **Workspace** ของเรา
- `member` table = User-Workspace relationship + role
- `invitation` table = Invite by email

---

## Current Implementation

The actual code keeps Better Auth intentionally small:

- Better Auth Drizzle adapter with PostgreSQL.
- Email/password auth enabled.
- Organization plugin enabled with `allowUserToCreateOrganization: true`.
- Local RBAC permission map in [lib/auth/permissions.ts](/Users/nontawatwongnuk/dev_bos/ledgioai/lib/auth/permissions.ts).
- Route protection in [proxy.ts](/Users/nontawatwongnuk/dev_bos/ledgioai/proxy.ts), not `middleware.ts`.

## Setup

### Installation

```bash
npm install better-auth
npx better-auth generate --adapter drizzle
```

CLI จะ generate schema สำหรับ auth tables ทั้งหมดให้อัตโนมัติ

### Auth Instance

```typescript
// lib/auth/index.ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { db } from "@/lib/db"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 วัน
    updateAge: 60 * 60 * 24,        // refresh ทุกวัน
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

})

export type Auth = typeof auth
```

### API Route Handler

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
```

### Client Setup

```typescript
// lib/auth/client.ts
import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  plugins: [organizationClient()],
})

export const { signIn, signOut, signUp, useSession, organization } = authClient
```

---

## Workspace = Organization

Better Auth ใช้คำว่า "organization" ในโค้ด แต่ใน UI ของเราเรียกว่า "Workspace"

```typescript
// สร้าง Workspace ใหม่ (client-side)
await authClient.organization.create({
  name: "บริษัท ABC จำกัด",
  slug: "abc-company",
})

// Switch active workspace
await authClient.organization.setActive({ organizationId: workspaceId })
```

### ดึง Active Workspace — Server Side

```typescript
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

const session = await auth.api.getSession({ headers: await headers() })
const workspaceId = session?.session.activeOrganizationId
if (!workspaceId) redirect("/workspaces")
```

### ดึง Active Workspace — Client Side

```typescript
"use client"
import { useSession } from "@/lib/auth/client"

const { data: session } = useSession()
const workspaceId = session?.session.activeOrganizationId
const workspaceName = session?.session.activeOrganization?.name
```

---

## RBAC Permission Checks

### Server-side Helper

```typescript
// lib/auth/permissions.ts
import { auth } from "@/lib/auth"

type Permission =
  | "agent:create" | "agent:read" | "agent:update" | "agent:delete"
  | "team:create" | "team:read" | "team:update" | "team:delete"
  | "meeting:start" | "meeting:read"
  | "memory:read" | "memory:update" | "memory:delete"
  | "settings:read" | "settings:update"
  | "member:invite" | "member:read"

export async function requirePermission(
  request: Request,
  permission: Permission
): Promise<{ workspaceId: string; userId: string } | Response> {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const workspaceId = session.session.activeOrganizationId
  if (!workspaceId) {
    return Response.json({ error: "No active workspace" }, { status: 400 })
  }

  const check = await auth.api.hasPermission({
    headers: request.headers,
    body: { permission: { [permission]: true } },
  })

  if (!check.success) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  return { workspaceId, userId: session.user.id }
}
```

### ใช้งานใน API Route

```typescript
// app/api/agents/route.ts
import { requirePermission } from "@/lib/auth/permissions"
import { createAgent } from "@/lib/db/queries/agents"

export async function POST(request: Request) {
  const auth = await requirePermission(request, "agent:create")
  if (auth instanceof Response) return auth   // early return error

  const body = await request.json()
  const parsed = createAgentSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const agent = await createAgent(auth.workspaceId, parsed.data)
  return Response.json({ data: agent }, { status: 201 })
}
```

---

## Roles Reference

This table reflects the current local permission map, not a Better Auth `roles` plugin config.

| Action | owner | admin | member | viewer |
|--------|:-----:|:-----:|:------:|:------:|
| อ่าน Agent/Team/Memory/Settings | ✅ | ✅ | ✅ | ✅ |
| สร้าง/แก้ Agent | ✅ | ✅ | ✅ | ❌ |
| ลบ Agent | ✅ | ✅ | ❌ | ❌ |
| สร้าง/แก้/ลบ Team | ✅ | ✅ | อ่านอย่างเดียว | อ่านอย่างเดียว |
| เริ่ม Meeting | ✅ | ✅ | ✅ | ❌ |
| ดู Meeting History | ✅ | ✅ | ✅ | ✅ |
| สร้าง/แก้ Memory | ✅ | ✅ | ✅ | ❌ |
| ลบ Memory | ✅ | ✅ | ❌ | ❌ |
| Workspace Settings update | ✅ | ✅ | ❌ | ❌ |
| Invite สมาชิก | ✅ | ✅ | ❌ | ❌ |
| อ่านสมาชิก | ✅ | ✅ | ✅ | ✅ |

---

## Auth Schema (auto-generated)

รัน `npx better-auth generate --adapter drizzle` แล้วจะได้ schema เหล่านี้:

```typescript
// lib/db/schema/auth.ts  ← generated โดย Better Auth CLI
// ไม่ต้องเขียนเอง

// Tables:
// user          — id, name, email, emailVerified, image, createdAt, updatedAt
// session       — id, userId, token, expiresAt, ipAddress, userAgent, activeOrganizationId
// account       — id, userId, providerId, accountId, password, ...
// verification  — id, identifier, value, expiresAt
// organization  — id, name, slug, logo, metadata, createdAt   ← = Workspace
// member        — id, userId, organizationId, role, createdAt
// invitation    — id, email, organizationId, role, status, expiresAt, inviterId
```

Key field: `sessions.activeOrganizationId` = workspaceId ที่ใช้ filter ทุก business query

---

## Route Protection

```typescript
// proxy.ts (root) — Next.js 16
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/register", "/api/auth"]
const STATIC_EXTENSIONS = /\.(json|png|jpg|jpeg|svg|ico|webp|js|css|woff2?|ttf|eot|map|txt|xml|webmanifest)$/

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  if (STATIC_EXTENSIONS.test(pathname)) return NextResponse.next()
  if (pathname === "/api/health") return NextResponse.next()

  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
```

---

## Login / Register

```typescript
// Login (client)
const { error } = await authClient.signIn.email({ email, password })

// Register (client)
const { error } = await authClient.signUp.email({ name, email, password })

// Logout
await authClient.signOut()
```

---

## Workspace Provider

```typescript
// components/providers/workspace-provider.tsx
"use client"
import { createContext, useContext } from "react"
import { useSession } from "@/lib/auth/client"

interface WorkspaceCtx {
  workspaceId: string | null
  workspaceName: string | null
  userRole: string | null
}

const WorkspaceContext = createContext<WorkspaceCtx>({
  workspaceId: null,
  workspaceName: null,
  userRole: null,
})

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  return (
    <WorkspaceContext.Provider value={{
      workspaceId: session?.session.activeOrganizationId ?? null,
      workspaceName: session?.session.activeOrganization?.name ?? null,
      userRole: session?.session.activeMemberRole ?? null,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspace = () => useContext(WorkspaceContext)
```

---

## Environment Variables

```bash
BETTER_AUTH_SECRET=your_32_byte_secret   # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3004    # Production: https://yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3004
```

---

## Note: ไม่มี Migration จาก NextAuth

โปรเจคนี้ยังไม่ได้ implement auth ใดๆ (ยังเป็น planning phase)
เริ่มต้นด้วย Better Auth ได้เลยตั้งแต่ Phase 1 — ไม่มี migration ที่ต้องทำ
