import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  const checks: Record<string, string> = {}

  try {
    await db.execute(sql`SELECT 1`)
    checks.database = "ok"
  } catch {
    checks.database = "error"
  }

  try {
    const { redis } = await import("@/lib/redis")
    await redis.ping()
    checks.redis = "ok"
  } catch {
    checks.redis = "error"
  }

  const healthy = Object.values(checks).every((v) => v === "ok")

  return Response.json(
    {
      status: healthy ? "healthy" : "degraded",
      version: process.env.npm_package_version || "1.0.0",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: healthy ? 200 : 503 }
  )
}
