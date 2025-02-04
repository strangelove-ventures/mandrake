import path from 'path'
import fs from 'fs/promises'
import { readContextConfig, readContextFiles, getWorkspacePath } from './files'
import { getWorkspacesDir } from './core'

export interface ContextFile {
  name: string
  path: string
  size: number
  type: string
  tokenEstimate?: number
}

export async function getContextFiles(workspacePath: string): Promise<ContextFile[]> {
  const files = await readContextFiles(workspacePath)
  const contextFiles: ContextFile[] = []

  for (const file of files) {
    const stats = await fs.stat(file.path)
    contextFiles.push({
      ...file,
      size: stats.size,
      type: path.extname(file.name).slice(1)
    })
  }

  return contextFiles
}

export async function readContextFile(workspaceName: string, fileName: string): Promise<string> {
  const filePath = path.join(getWorkspacesDir(), workspaceName, 'context', 'files', fileName)
  return fs.readFile(filePath, 'utf-8')
}

export async function addContextFile(workspacePath: string, sourcePath: string) {
  const fileName = path.basename(sourcePath)
  const targetPath = path.join(workspacePath, 'context', 'files', fileName)
  await fs.copyFile(sourcePath, targetPath)
}

export async function removeContextFile(workspacePath: string, fileName: string) {
  const filePath = path.join(workspacePath, 'context', 'files', fileName)
  await fs.unlink(filePath)
}

export interface ContextStats {
  totalFiles: number
  totalSize: number
  fileTypes: Record<string, number>
}