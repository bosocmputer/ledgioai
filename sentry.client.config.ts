import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // 10% of transactions — ปรับเพิ่มได้เมื่อมีผู้ใช้มากขึ้น
  tracesSampleRate: 0.1,

  // เปิดเฉพาะ production
  enabled: process.env.NODE_ENV === "production",

  // ไม่ส่ง console.log ธรรมดา — เฉพาะ error
  integrations: [],
})
