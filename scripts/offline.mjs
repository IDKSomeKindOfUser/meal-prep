// Writes dist/sw.js, which keeps all files of the build for offline work. Runs after `vite build`.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { sep } from 'node:path'

const files = readdirSync('dist', { recursive: true })
  .map((f) => f.split(sep).join('/'))
  .filter((f) => f !== 'sw.js' && /\.(html|js|css|woff2|svg|png|webp|webmanifest)$/.test(f))
  .sort()
const template = readFileSync('src/sw.js', 'utf8')
const hash = createHash('sha256').update(template)
for (const f of files) hash.update(f).update(readFileSync(`dist/${f}`))
writeFileSync('dist/sw.js', template
  .replace('__VERSION__', hash.digest('hex').slice(0, 12))
  .replace('__FILES__', JSON.stringify(files.map((f) => `/${f}`))))
console.log(`dist/sw.js: ${files.length} files`)
