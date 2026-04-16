/**
 * System Prompt Builder
 * Construct system prompts for each meeting mode / phase
 */

import type { agents } from "@/lib/db/schema"
import type { MeetingContext, FileContext } from "./context"

type AgentRow = typeof agents.$inferSelect

// ── System Prompt ──────────────────────────────────────

export function buildSystemPrompt(agent: AgentRow, context: MeetingContext): string {
  const sections: string[] = [agent.soul]

  if (context.workspaceInfo) {
    sections.push(`## ข้อมูล Workspace\n${context.workspaceInfo}`)
  }
  if (context.memoryFactsText) {
    sections.push(`## สิ่งที่จำได้จากการประชุมครั้งก่อน\n${context.memoryFactsText}`)
  }
  if (context.fileContexts.length > 0) {
    sections.push(`## เอกสารแนบ\n${buildFileContextText(context.fileContexts)}`)
  }
  sections.push(context.antiHallucination)

  return sections.join("\n\n")
}

function buildFileContextText(files: FileContext[]): string {
  return files
    .map((f) => `### ${f.filename} (~${f.tokens} tokens)\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n")
}

// ── Quick Ask ──────────────────────────────────────────

export function buildQuickAskMessage(question: string): string {
  return `${question}

ตอบให้กระชับ ครบถ้วน อ้างอิงแหล่งข้อมูลถ้ามี`
}

// ── Consult: Analysis Phase ────────────────────────────

export function buildAnalysisPrompt(question: string): string {
  return `คำถาม: ${question}

วิเคราะห์คำถามนี้อย่างละเอียดจากมุมมองความเชี่ยวชาญของคุณ:
1. สรุปประเด็นสำคัญ
2. ให้คำตอบหรือคำแนะนำพร้อมเหตุผล
3. ระบุข้อควรระวังหรือความเสี่ยง
4. อ้างอิงกฎหมาย/มาตรฐาน (ถ้าเกี่ยวข้อง)`
}

// ── Consult: Discussion Phase ──────────────────────────

export function buildDiscussionPrompt(
  question: string,
  myAnalysis: string,
  othersContext: string,
  agent: AgentRow,
): string {
  return `คำถามเดิม: ${question}

## การวิเคราะห์ของคุณ (${agent.emoji} ${agent.name}):
${myAnalysis}

## การวิเคราะห์ของคนอื่น:
${othersContext}

อ่านการวิเคราะห์ของคนอื่นแล้ว:
- จุดที่เห็นด้วย → ยืนยัน
- จุดที่เห็นต่าง → ท้วงพร้อมเหตุผล
- จุดที่ต้องเพิ่มเติม → เสริมข้อมูล
- ตอบให้กระชับ เน้นจุดสำคัญ`
}

// ── Full Board: Clarification Phase ────────────────────

export function buildClarificationPrompt(question: string): string {
  return `คำถาม: ${question}

คุณเป็นประธานการประชุม (Chairman) ก่อนเริ่มประชุม ให้ถามคำถามเพิ่มเติม 3-5 ข้อที่จำเป็นต่อการวิเคราะห์

ตอบเป็น JSON array ของ strings เท่านั้น:
["คำถามที่ 1?", "คำถามที่ 2?", "คำถามที่ 3?"]

กฎ:
- ถามเฉพาะสิ่งที่จำเป็นจริงๆ
- ถ้าคำถามชัดเจนอยู่แล้ว return []
- ห้ามถามซ้ำกับข้อมูลที่มีอยู่ใน context`
}

// ── Full Board: Findings Phase ─────────────────────────

export function buildFindingsPrompt(
  question: string,
  myAnalysis: string,
  agent: AgentRow,
): string {
  return `คำถาม: ${question}

## ผลการวิเคราะห์ของคุณ:
${myAnalysis}

นำเสนอสรุปผลการวิเคราะห์อย่างเป็นทางการ ในฐานะ ${agent.role}:
- สรุปประเด็นหลัก 2-3 ข้อ
- คำแนะนำ
- ข้อควรระวัง
- ใช้ภาษาที่ตรงกับบทบาทของคุณ`
}

// ── Full Board: Discussion Phase ───────────────────────

export function buildBoardDiscussionPrompt(
  question: string,
  allFindings: string,
  agent: AgentRow,
): string {
  return `คำถาม: ${question}

## สรุปผลจากทุกคน:
${allFindings}

ในฐานะ ${agent.role} อ่านผลจากทุกคนแล้ว:
- ยืนยันจุดที่เห็นด้วย
- ท้วงจุดที่ไม่เห็นด้วยพร้อมเหตุผล
- เสริมมุมมองที่ขาดหายไป
- กระชับ ตรงประเด็น`
}

// ── Full Board: Synthesis Phase ────────────────────────

export function buildSynthesisPrompt(
  question: string,
  allDiscussions: string,
  clarificationContext: string,
): string {
  return `คำถามเดิม: ${question}
${clarificationContext ? `\n## ข้อมูลเพิ่มเติมจากผู้ถาม:\n${clarificationContext}\n` : ""}
## การอภิปรายทั้งหมด:
${allDiscussions}

คุณเป็นประธานการประชุม (Chairman) สรุปมติที่ประชุม:

1. **คำตอบ** — สรุปคำตอบที่เป็นมติร่วม
2. **จุดที่เห็นตรงกัน** — ประเด็นที่ทุกคนเห็นพ้อง
3. **จุดที่ยังถกเถียง** — ประเด็นที่มีความเห็นต่าง (ถ้ามี)
4. **คำแนะนำ** — ขั้นตอนถัดไปที่ควรทำ
5. **ข้อควรระวัง** — สิ่งที่ต้องระมัดระวัง`
}

// ── Chairman Detection ─────────────────────────────────

export function detectChairman(agentRows: AgentRow[]): AgentRow {
  // seniority ต่ำสุด = ระดับสูงสุด = Chairman
  return [...agentRows].sort((a, b) => (a.seniority ?? 99) - (b.seniority ?? 99))[0]
}

export function sortBySeniority(agentRows: AgentRow[]): AgentRow[] {
  return [...agentRows].sort((a, b) => (a.seniority ?? 99) - (b.seniority ?? 99))
}
