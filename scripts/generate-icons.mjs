import sharp from "sharp"
import { writeFileSync } from "fs"
import { join } from "path"

const sizes = [192, 512]
const publicDir = join(import.meta.dirname, "..", "public")

for (const size of sizes) {
  const fontSize = Math.round(size * 0.35)
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#2563eb"/>
        <stop offset="100%" style="stop-color:#1d4ed8"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#bg)"/>
    <text x="50%" y="54%" font-family="Arial,Helvetica,sans-serif" font-weight="700"
      font-size="${fontSize}" fill="white" text-anchor="middle" dominant-baseline="middle">L</text>
  </svg>`

  const buf = await sharp(Buffer.from(svg)).png().toBuffer()
  const outPath = join(publicDir, `icon-${size}.png`)
  writeFileSync(outPath, buf)
  console.log(`Created ${outPath} (${buf.length} bytes)`)
}

// Also create favicon
const faviconSvg = `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="url(#bg)"/>
  <text x="50%" y="54%" font-family="Arial,Helvetica,sans-serif" font-weight="700"
    font-size="20" fill="white" text-anchor="middle" dominant-baseline="middle">L</text>
</svg>`
const favicon = await sharp(Buffer.from(faviconSvg)).png().toBuffer()
writeFileSync(join(publicDir, "favicon.ico"), favicon)
console.log(`Created favicon.ico (${favicon.length} bytes)`)
