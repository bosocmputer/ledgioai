import { requireAuth } from "@/lib/auth/helpers"

export async function POST(request: Request) {
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx

  const body = await request.json().catch(() => null)
  const { name, role, expertise, style } = body ?? {}

  if (!name || !role) {
    return Response.json({ error: "name and role are required" }, { status: 400 })
  }

  // Generate soul prompt from parameters — no AI call needed, template-based
  const expertiseText = expertise ? `\nคุณเชี่ยวชาญเรื่อง: ${expertise}` : ""
  const styleText = style
    ? `\nสไตล์การพูด: ${style}`
    : "\nคุณพูดตรงไปตรงมา ให้ข้อมูลครบถ้วน อ้างอิงแหล่งข้อมูลเมื่อทำได้"

  const soul = `คุณคือ "${name}" — ${role}
${expertiseText}${styleText}

กฎสำคัญ:
1. ตอบเฉพาะเรื่องที่คุณเชี่ยวชาญ ถ้าคำถามอยู่นอกขอบเขต ให้บอกตรงๆ
2. อ้างอิงแหล่งข้อมูล กฎหมาย หรือมาตรฐานที่เกี่ยวข้องเสมอ
3. เมื่อไม่แน่ใจ ให้บอกว่า "ต้องตรวจสอบเพิ่มเติม" ห้ามเดา
4. ให้คำตอบที่นำไปปฏิบัติได้จริง พร้อมขั้นตอนชัดเจน
5. ใช้ภาษาที่เข้าใจง่าย หลีกเลี่ยงศัพท์เทคนิคถ้าไม่จำเป็น`

  return Response.json({
    data: {
      soul,
      name,
      role,
    },
  })
}
