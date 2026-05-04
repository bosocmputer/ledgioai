import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://api.anthropic.com https://openrouter.ai https://api.openai.com https://generativelanguage.googleapis.com https://google.serper.dev https://serpapi.com https://api.supermemory.ai https://*.sentry.io",
    ].join("; "),
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
]

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/*": [
      "node_modules/@napi-rs/canvas/**/*",
      "node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
      "node_modules/@napi-rs/canvas-linux-x64-musl/**/*",
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // ไม่ print build output
  silent: !process.env.CI,
  // Upload source maps เฉพาะตอน build จริง
  widenClientFileUpload: true,
  // ซ่อน source maps จาก browser
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // ไม่ใช้ Sentry debug logger (ใช้ Pino แทน)
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
  // ปิด telemetry ของ Sentry CLI
  telemetry: false,
})
