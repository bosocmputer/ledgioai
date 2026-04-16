// scripts/add-dark-mode.mjs — one-time bulk dark: variant adder
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs"
import { join } from "path"

const replacements = [
  // backgrounds
  [/\bbg-white\b(?!\s+dark:)/g, "bg-white dark:bg-gray-900"],
  [/\bbg-gray-50\b(?!\s+dark:)/g, "bg-gray-50 dark:bg-gray-950"],
  [/\bbg-gray-100\b(?!\s+dark:)/g, "bg-gray-100 dark:bg-gray-800"],
  [/\bbg-gray-200\b(?!\s+dark:)/g, "bg-gray-200 dark:bg-gray-700"],

  // text
  [/\btext-gray-900\b(?!\s+dark:)/g, "text-gray-900 dark:text-gray-100"],
  [/\btext-gray-700\b(?!\s+dark:)/g, "text-gray-700 dark:text-gray-300"],
  [/\btext-gray-600\b(?!\s+dark:)/g, "text-gray-600 dark:text-gray-400"],
  [/\btext-gray-500\b(?!\s+dark:)/g, "text-gray-500 dark:text-gray-400"],

  // borders
  [/\bborder-gray-200\b(?!\s+dark:)/g, "border-gray-200 dark:border-gray-700"],
  [/\bborder-gray-300\b(?!\s+dark:)/g, "border-gray-300 dark:border-gray-600"],

  // hover backgrounds
  [/\bhover:bg-gray-100\b(?!\s+dark:)/g, "hover:bg-gray-100 dark:hover:bg-gray-800"],
  [/\bhover:bg-gray-50\b(?!\s+dark:)/g, "hover:bg-gray-50 dark:hover:bg-gray-800"],

  // colored backgrounds (light variants)
  [/\bbg-blue-50\b(?!\s+dark:)/g, "bg-blue-50 dark:bg-blue-950"],
  [/\bbg-red-50\b(?!\s+dark:)/g, "bg-red-50 dark:bg-red-950"],
  [/\bbg-green-50\b(?!\s+dark:)/g, "bg-green-50 dark:bg-green-950"],
  [/\bbg-amber-50\b(?!\s+dark:)/g, "bg-amber-50 dark:bg-amber-950"],
  [/\bbg-orange-50\b(?!\s+dark:)/g, "bg-orange-50 dark:bg-orange-950"],
  [/\bbg-purple-50\b(?!\s+dark:)/g, "bg-purple-50 dark:bg-purple-950"],
  [/\bbg-yellow-50\b(?!\s+dark:)/g, "bg-yellow-50 dark:bg-yellow-950"],

  // colored text
  [/\btext-blue-700\b(?!\s+dark:)/g, "text-blue-700 dark:text-blue-300"],
  [/\btext-red-700\b(?!\s+dark:)/g, "text-red-700 dark:text-red-300"],
  [/\btext-green-700\b(?!\s+dark:)/g, "text-green-700 dark:text-green-300"],
  [/\btext-amber-700\b(?!\s+dark:)/g, "text-amber-700 dark:text-amber-300"],

  // hover colored
  [/\bhover:bg-red-50\b(?!\s+dark:)/g, "hover:bg-red-50 dark:hover:bg-red-950"],
  [/\bhover:bg-blue-50\b(?!\s+dark:)/g, "hover:bg-blue-50 dark:hover:bg-blue-950"],

  // input focus stays same (blue works in dark too)
  // placeholder stays same (gray-400 is visible on both)
]

// Files we've already manually handled — skip them
const skipFiles = new Set([
  "components/layout/sidebar.tsx",
  "components/agents/drag-drop-agent-picker.tsx",
  "components/agents/agent-preview-modal.tsx",
  "components/providers/theme-provider.tsx",
  "app/globals.css",
  "app/providers.tsx",
])

function walk(dir, base = "") {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = join(base, entry)
    if (statSync(full).isDirectory()) {
      files.push(...walk(full, rel))
    } else if (entry.endsWith(".tsx")) {
      files.push({ full, rel })
    }
  }
  return files
}

const root = process.cwd()
const targets = [
  ...walk(join(root, "app"), "app"),
  ...walk(join(root, "components"), "components"),
]

let totalChanges = 0
for (const { full, rel } of targets) {
  if (skipFiles.has(rel)) continue

  let content = readFileSync(full, "utf8")
  const original = content
  
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement)
  }

  if (content !== original) {
    writeFileSync(full, content)
    const changes = content.length - original.length
    console.log(`✅ ${rel} (+${changes} chars)`)
    totalChanges++
  }
}

console.log(`\nDone! Modified ${totalChanges} files.`)
