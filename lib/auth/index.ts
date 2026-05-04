import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { db } from "@/lib/db"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "ledgio-build-time-secret-change-in-runtime-env",

  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Phase 1: ปิดก่อน
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 24,       // refresh daily
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
})

export type Auth = typeof auth
