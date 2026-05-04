import { PDFParse } from "pdf-parse"
import ExcelJS from "exceljs"
import * as mammoth from "mammoth"

export interface ParsedDocument {
  content: string
  meta: string
  tokens: number
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/csv": "csv",
  "application/json": "json",
  "text/plain": "txt",
  "text/markdown": "md",
}

export function isAllowedMimeType(mimeType: string): boolean {
  return mimeType in ALLOWED_MIME_TYPES
}

export function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for English, ~2 for Thai
  const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) || []).length
  const otherChars = text.length - thaiChars
  return Math.ceil(thaiChars / 2 + otherChars / 4)
}

export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ParsedDocument> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("ไฟล์ขนาดเกิน 10MB")
  }

  if (!isAllowedMimeType(mimeType)) {
    throw new Error(`ไม่รองรับไฟล์ประเภท ${mimeType}`)
  }

  const ext = ALLOWED_MIME_TYPES[mimeType]

  switch (ext) {
    case "pdf":
      return parsePdf(buffer, filename)
    case "xlsx":
      return parseExcel(buffer, filename)
    case "docx":
      return parseDocx(buffer, filename)
    case "csv":
      return parseCsv(buffer, filename)
    case "json":
      return parseJson(buffer, filename)
    case "txt":
    case "md":
      return parseText(buffer, filename, ext)
    default:
      throw new Error(`ไม่รองรับไฟล์ประเภท ${ext}`)
  }
}

async function parsePdf(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const textResult = await parser.getText()
  const infoResult = await parser.getInfo()
  await parser.destroy()
  const content = textResult.text.trim()
  const numpages = infoResult.pages?.length ?? textResult.pages?.length ?? 0
  return {
    content,
    meta: `PDF: ${numpages} pages`,
    tokens: estimateTokens(content),
  }
}

async function parseExcel(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])
  const sheets: string[] = []

  workbook.eachSheet((sheet) => {
    const rows: string[] = []
    sheet.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : []
      rows.push(
        values
          .map((value) => {
            if (value == null) return ""
            if (typeof value === "object" && "text" in value) return String(value.text)
            if (typeof value === "object" && "result" in value) return String(value.result ?? "")
            return String(value)
          })
          .join(","),
      )
    })
    sheets.push(`=== Sheet: ${sheet.name} ===\n${rows.join("\n")}`)
  })

  if (sheets.length === 0) {
    sheets.push("ไม่พบข้อมูลในไฟล์ Excel")
  }

  const content = sheets.join("\n\n")
  return {
    content,
    meta: `Excel: ${workbook.worksheets.length} sheets (${workbook.worksheets.map((sheet) => sheet.name).join(", ")})`,
    tokens: estimateTokens(content),
  }
}

async function parseDocx(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer })
  const content = result.value.trim()
  return {
    content,
    meta: `Word document`,
    tokens: estimateTokens(content),
  }
}

function parseCsv(buffer: Buffer, filename: string): ParsedDocument {
  const content = buffer.toString("utf-8").trim()
  const lines = content.split("\n").length
  return {
    content,
    meta: `CSV: ${lines} rows`,
    tokens: estimateTokens(content),
  }
}

function parseJson(buffer: Buffer, filename: string): ParsedDocument {
  const raw = buffer.toString("utf-8")
  // Validate JSON
  JSON.parse(raw)
  const content = raw.trim()
  return {
    content,
    meta: `JSON: ${buffer.length} bytes`,
    tokens: estimateTokens(content),
  }
}

function parseText(buffer: Buffer, filename: string, ext: string): ParsedDocument {
  const content = buffer.toString("utf-8").trim()
  const lines = content.split("\n").length
  return {
    content,
    meta: `${ext.toUpperCase()}: ${lines} lines`,
    tokens: estimateTokens(content),
  }
}
