import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
}

async function readIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

export async function upsertFile(filePath: string, nextContent: string, checkOnly: boolean): Promise<boolean> {
  const current = await readIfExists(filePath)
  if (current === nextContent) {
    return false
  }

  if (!checkOnly) {
    await ensureDir(filePath)
    await writeFile(filePath, nextContent, 'utf8')
  }

  return true
}
