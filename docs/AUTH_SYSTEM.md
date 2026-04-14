# LEDGIO AI — Authentication & Authorization System

> NextAuth v5 + RBAC + API Key Management

## 🎯 Overview

LEDGIO AI ใช้ **NextAuth v5 (Auth.js)** เป็นระบบ authentication หลัก พร้อม Role-Based Access Control (RBAC) ที่ scope ตาม company

## 🔧 Tech Stack

| Component | Technology |
|-----------|-----------|
| Auth Library | NextAuth v5 (Auth.js) |
| Database Adapter | Drizzle Adapter (@auth/drizzle-adapter) |
| Password Hashing | bcryptjs |
| Session Strategy | JWT (stateless) + DB sessions for revocation |
| Providers | Credentials (email/password) + Google OAuth (optional) |

## 📦 Dependencies

```bash
npm install next-auth@beta @auth/drizzle-adapter bcryptjs
npm install -D @types/bcryptjs
```

## 🏗️ Implementation

### 1. Auth Configuration

```typescript
// auth.ts (root)
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!user || !user.hashedPassword) return null;
        if (!user.isActive) return null;

        const valid = await bcrypt.compare(password, user.hashedPassword);
        if (!valid) return null;

        // Update last login
        await db.update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    // Google OAuth (optional — uncomment when ready)
    // Google({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
```

### 2. Route Handler

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

### 3. Middleware (Protected Routes)

```typescript
// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!req.auth) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
```

### 4. User Registration API

```typescript
// app/api/auth/register/route.ts
import { db } from "@/lib/db";
import { users, companies, userCompanies } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  companyName: z.string().min(2).max(255).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, companyName } = parsed.data;

  // Check if user exists
  const existing = await db.select().from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  if (existing.length > 0) {
    return Response.json({ error: "Email already registered" }, { status: 409 });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user + default company in transaction
  const result = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      name,
      email: email.toLowerCase(),
      hashedPassword,
    }).returning();

    // Create default company
    const [company] = await tx.insert(companies).values({
      name: companyName || `${name}'s Company`,
    }).returning();

    // Link user to company as owner
    await tx.insert(userCompanies).values({
      userId: user.id,
      companyId: company.id,
      role: "owner",
      isDefault: true,
    });

    return { user, company };
  });

  return Response.json({
    message: "Registration successful",
    userId: result.user.id,
    companyId: result.company.id,
  }, { status: 201 });
}
```

## 🛡️ RBAC (Role-Based Access Control)

### Role Hierarchy

```
owner > admin > member > viewer
```

### Permission Matrix

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| Delete company | ✅ | ❌ | ❌ | ❌ |
| Update company info | ✅ | ✅ | ❌ | ❌ |
| Manage members | ✅ | ✅ | ❌ | ❌ |
| Manage API keys | ✅ | ✅ | ❌ | ❌ |
| Create/edit agents | ✅ | ✅ | ❌ | ❌ |
| Create/edit teams | ✅ | ✅ | ✅ | ❌ |
| Start meetings | ✅ | ✅ | ✅ | ❌ |
| Upload documents | ✅ | ✅ | ✅ | ❌ |
| View history | ✅ | ✅ | ✅ | ✅ |
| View stats | ✅ | ✅ | ✅ | ✅ |

### Permission Check Helper

```typescript
// lib/auth/permissions.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userCompanies } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type Role = "owner" | "admin" | "member" | "viewer";

const ROLE_LEVEL: Record<Role, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function requireCompanyAccess(companyId: string, minRole: Role = "viewer") {
  const user = await requireAuth();

  const [membership] = await db
    .select()
    .from(userCompanies)
    .where(
      and(
        eq(userCompanies.userId, user.id),
        eq(userCompanies.companyId, companyId)
      )
    )
    .limit(1);

  if (!membership) throw new Error("No access to this company");
  if (ROLE_LEVEL[membership.role] < ROLE_LEVEL[minRole]) {
    throw new Error("Insufficient permissions");
  }

  return { user, membership };
}

// Get active company for current user
export async function getActiveCompany(userId: string): Promise<string> {
  // Check cookie/header for active company
  // Fallback to default company
  const [defaultCompany] = await db
    .select()
    .from(userCompanies)
    .where(
      and(
        eq(userCompanies.userId, userId),
        eq(userCompanies.isDefault, true)
      )
    )
    .limit(1);

  if (!defaultCompany) throw new Error("No company found");
  return defaultCompany.companyId;
}
```

## 🔑 Active Company Management

ผู้ใช้สามารถสลับบริษัทได้ผ่าน **company switcher** ใน sidebar:

```typescript
// Company context stored in cookie
// Cookie name: "ledgio-active-company"
// Value: companyId (UUID)

// API to switch company
// POST /api/companies/switch
// Body: { companyId: "uuid" }
// Response: Set-Cookie: ledgio-active-company=uuid

// Every API route reads active company from:
// 1. Cookie "ledgio-active-company"
// 2. Header "X-Company-Id"  
// 3. Fallback: user's default company
```

### Company Context Helper

```typescript
// lib/auth/company-context.ts
import { cookies } from "next/headers";
import { requireAuth, getActiveCompany } from "./permissions";

export async function getCompanyContext() {
  const user = await requireAuth();
  
  const cookieStore = await cookies();
  const activeCompanyId = cookieStore.get("ledgio-active-company")?.value;
  
  if (activeCompanyId) {
    // Verify user has access
    // ... check userCompanies
    return { userId: user.id, companyId: activeCompanyId };
  }
  
  const companyId = await getActiveCompany(user.id);
  return { userId: user.id, companyId };
}
```

## 📱 Login/Register Pages

### Login Page Structure

```
app/
  (auth)/
    layout.tsx        — Minimal layout (no sidebar)
    login/
      page.tsx        — Login form (email + password)
    register/
      page.tsx        — Register form (name + email + password + company name)
```

### Login Flow
1. User enters email + password
2. NextAuth validates via Credentials provider
3. JWT token created with user.id
4. Redirect to dashboard `/`
5. Middleware injects user context on every request

### Register Flow
1. User enters name, email, password, company name (optional)
2. POST `/api/auth/register`
3. Create user + default company + owner role (transaction)
4. Auto-login via signIn("credentials")
5. Redirect to dashboard

## 🔄 Session Types

```typescript
// types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
    };
  }
}
```

## 🌐 Environment Variables

```env
# Auth
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
AUTH_URL=https://ledgio.ai

# Google OAuth (optional)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# Encryption
ENCRYPTION_KEY=<64-hex-chars>
```

## 🔒 Security Considerations

1. **Password Requirements**: min 8 chars, hashed with bcrypt (cost 12)
2. **Rate Limiting**: Login attempts limited to 5/min per IP
3. **Session Expiry**: JWT expires in 30 days, refresh on activity
4. **CSRF**: NextAuth built-in CSRF protection
5. **Brute Force**: Account lockout after 10 failed attempts (future)
6. **Password Reset**: Email-based reset flow (future)
