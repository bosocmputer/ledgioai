# LEDGIO AI — Backlog

> รายการ features ที่ยังไม่ได้ทำ — อัปเดต April 2026
> เรียงตาม business value จากสูงไปต่ำ

---

## P0 — ต้องทำก่อน launch จริง

### B-01: Email Transactional (Resend)
**Why**: Workspace invitation ตอนนี้ส่ง token ใน response body — ไม่มีอีเมลแจ้งเลย
**What**:
- ติดตั้ง `resend` package
- สร้าง email template: invitation, welcome, meeting summary
- เพิ่ม `RESEND_API_KEY` ใน `.env`
- เรียก send email ใน `POST /api/workspaces/[id]/invite` route
**Effort**: ~1 วัน

### B-02: Workspace Profile Page
**Why**: Agents ดึง memory facts ได้ แต่ไม่มีหน้าให้ user กรอกข้อมูลพื้นฐานบริษัท (ชื่อ, VAT, ประเภทธุรกิจ) ที่ agents ควรรู้ตลอด
**What**:
- หน้า `/settings/workspace` — กรอก: ชื่อบริษัท, เลข VAT, ขนาดบริษัท, ประเภทธุรกิจ, ปีงบฯ, มาตรฐานบัญชี
- เก็บใน `workspace_settings.metadata` (JSONB)
- inject เข้า meeting context โดยอัตโนมัติ
**Effort**: ~1 วัน

---

## P1 — สำคัญ ช่วยเพิ่ม revenue/retention

### B-03: Subscription Billing (Omise / Stripe)
**Why**: ตอนนี้ไม่มี payment — ทุก workspace ใช้ฟรีไม่จำกัด
**What**:
- Plans: Free (3 agents, 50 meetings/เดือน), Pro (฿990/เดือน, unlimited), Enterprise (custom)
- ติดตั้ง Omise SDK (Thai) หรือ Stripe
- Billing page + invoice history
- Enforce plan limits ใน API (agents count, meetings/day)
- Webhook รับ payment events
**Effort**: ~1 สัปดาห์

### B-04: Super Admin Panel
**Why**: ไม่มีทางดู users/workspaces/usage จาก dashboard เลย
**What**:
- Route `/admin` — guard ด้วย `role === "super_admin"`
- Tables: workspaces, users, usage stats, error counts
- Actions: suspend workspace, reset quota, view audit logs
- Token/cost usage รวมทุก workspace
**Effort**: ~3 วัน

### B-05: LINE Bot Integration
**Why**: กลุ่มเป้าหมาย (นักบัญชี/SME ไทย) ใช้ LINE เป็นหลัก — Quick Ask ผ่าน LINE จะเพิ่ม DAU มาก
**What**:
- LINE Messaging API webhook (`/api/webhooks/line`)
- Map LINE userId → workspace (link account flow)
- Quick Ask mode เท่านั้น (text in → text out)
- รองรับ reply token + push message
**Effort**: ~3 วัน

### B-06: Agent Marketplace / Template Sharing
**Why**: ช่วย onboarding — user ใหม่ไม่ต้องสร้าง agent จากศูนย์
**What**:
- หน้า `/marketplace` — browse public agent templates
- Workspace สามารถ publish template ของตัวเองได้ (optional)
- Rating/review system
- เพิ่ม `isPublic` + `publishedBy` + `downloadCount` ใน `agent_templates` table
**Effort**: ~4 วัน

### B-07: REST API Access + API Keys
**Why**: ลูกค้า Enterprise ต้องการ integrate LedgioAI กับ app ของตัวเองผ่าน API
**What**:
- Workspace API key management UI (`/settings/api-keys`)
- Generate/revoke API keys (store hashed)
- API key auth middleware (header: `X-API-Key`)
- Rate limit per API key (separate from user rate limit)
- Docs page (`/api/docs`) — Swagger/OpenAPI
**Effort**: ~4 วัน

---

## P2 — เพิ่มคุณภาพ / UX

### B-08: Dark Mode
**Why**: ตอนนี้มี `dark:` classes อยู่ทุกที่แล้ว แต่ไม่มี toggle
**What**:
- เพิ่ม `ThemeProvider` (next-themes)
- Theme toggle button ใน sidebar/header
- Persist preference ใน localStorage
**Effort**: ~4 ชั่วโมง

### B-09: Drag-and-Drop Agent Picker (Meeting Room)
**Why**: UX ตอนนี้ต้องเลือก agent ผ่าน dropdown — ลาก agent card เข้าห้องประชุมจะ intuitive กว่า
**What**:
- ใช้ `@dnd-kit/core` (lightweight, accessible)
- Meeting Room sidebar: agent cards ที่ drag ได้
- Team builder: drag agent เข้า/ออกทีม
**Effort**: ~2 วัน

### B-10: Meeting Summary Email
**Why**: หลังประชุมจบ ส่ง summary ให้ user ทาง email — เพิ่ม engagement
**What**:
- Trigger หลัง `runMeeting` complete (Full Board เท่านั้น)
- Email template: คำถาม + สรุปมติ + memory facts ที่ extract ได้
- User opt-in setting (default: off)
- ต้องทำ B-01 ก่อน
**Effort**: ~1 วัน (ต้องมี B-01 ก่อน)

### B-11: Webhook Outbound
**Why**: Trigger meeting จาก event ภายนอก (เช่น เปิด invoice ใหม่ → Full Board ตรวจ)
**What**:
- Webhook endpoint รับ event จากภายนอก
- Map event type → meeting mode + team
- Retry logic + delivery logs
**Effort**: ~3 วัน

### B-12: MCP/ERP Integration (Centrix)
**Why**: MASTER_PLAN ระบุ deferred — เชื่อม Centrix ให้ agent ดึงข้อมูล GL, AP, AR ได้
**What**:
- Mastra MCP plugin ใน agent factory
- UI: กรอก MCP endpoint URL ใน agent form (มีช่องอยู่แล้ว)
- Test connection button
- จำกัด access mode: read-only vs read-write
**Effort**: ~3 วัน

---

## P3 — Nice to have

### B-13: Meeting Rating & Feedback
**Why**: `meetings.rating` column มีอยู่แล้วใน schema แต่ไม่มี UI ให้ user rate
**What**:
- Star rating (1-5) + comment หลัง meeting จบ
- แสดงใน Insights page (avg rating KPI มีอยู่แล้ว)
**Effort**: ~4 ชั่วโมง

### B-14: Scheduled Meetings
**Why**: `scheduled_meetings` table มีอยู่แล้วใน schema
**What**:
- UI: กำหนดเวลาประชุมล่วงหน้า (daily standup, weekly review)
- Cron job trigger meeting ตามเวลา
- ส่ง result ทาง email (ต้องมี B-01)
**Effort**: ~2 วัน

### B-15: Multi-language UI (EN/TH)
**Why**: ถ้าต้องการขยายตลาดนอก Thailand
**What**:
- i18n ด้วย `next-intl`
- ไฟล์ locale: `th.json`, `en.json`
- Language switcher ใน settings
**Effort**: ~3 วัน

---

## เสร็จแล้ว (ไม่ต้องทำ)

| Feature | เสร็จเมื่อ |
|---------|----------|
| Token Quota enforcement (maxTokensPerMeeting, maxMeetingsPerDay) | April 2026 |
| Meeting timeout guards (30s/90s/300s) | April 2026 |
| Sentry error tracking | April 2026 |
| LLM cost calculator (USD/THB) | April 2026 |
| Cost KPI ใน Insights page | April 2026 |
| Agent Preview modal | April 2026 |
| Consult mode synthesis phase | April 2026 |
| Agent stats inputTokens fix | April 2026 |
| Dockerfile health check fix (IPv6→IPv4) | April 2026 |
