import {readdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'

const outputDir = path.resolve(process.argv[2] || 'dist')
const configuredBase = process.env.TARO_APP_PUBLIC_PATH || '/'
const segments = configuredBase.split('/').filter(Boolean)
const basePath = segments.length ? `/${segments.join('/')}/` : '/'

if (basePath === '/') {
  console.log('Root deployment path; no static asset rewrite needed.')
  process.exit(0)
}

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map'])
let changedFiles = 0
let replacements = 0

async function visit(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await visit(filePath)
      continue
    }
    if (!textExtensions.has(path.extname(entry.name))) continue

    const source = await readFile(filePath, 'utf8')
    let fileReplacements = 0
    const output = source.replace(/(["'(])\/static\/images\//g, (_match, opener) => {
      fileReplacements += 1
      return `${opener}${basePath}static/images/`
    })
    if (fileReplacements > 0) {
      await writeFile(filePath, output)
      changedFiles += 1
      replacements += fileReplacements
    }
  }
}

await visit(outputDir)
if (replacements === 0) {
  throw new Error(`No root-relative static image paths were found in ${outputDir}; refusing to publish an unverified base path.`)
}

console.log(`Rewrote ${replacements} static image URL(s) across ${changedFiles} file(s) to ${basePath}static/images/`)
