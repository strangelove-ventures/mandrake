import fs from 'fs'
import { EventEmitter } from 'events'
import { getWorkspacesDir } from './core'

export interface WorkspaceChangeEvent {
    type: 'add' | 'change' | 'unlink'
    workspaceName: string
}

export class WorkspaceWatcher extends EventEmitter {
    private watcher?: fs.FSWatcher

    constructor() {
        super()
    }

    async start() {
        const dir = getWorkspacesDir()

        try {
            this.watcher = fs.watch(dir, (eventType, filename) => {
                if (!filename) return

                // Only emit for workspace.json changes or directory removal
                if (filename.endsWith('workspace.json') || !filename.includes('.')) {
                    this.emit('change', {
                        type: eventType === 'rename' ? (fs.existsSync(`${dir}/${filename}`) ? 'add' : 'unlink') : 'change',
                        workspaceName: filename.replace('/workspace.json', '')
                    })
                }
            })
        } catch (error) {
            console.warn('Failed to start workspace watcher:', error)
        }
    }

    stop() {
        this.watcher?.close()
    }
}

// Singleton instance for app-wide use
let watcher: WorkspaceWatcher | undefined

export function getWorkspaceWatcher(): WorkspaceWatcher {
    if (!watcher) {
        watcher = new WorkspaceWatcher()
    }
    return watcher
}