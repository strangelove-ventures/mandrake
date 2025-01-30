import { WebSocket, WebSocketServer } from 'ws'
import { watch } from 'fs'
import path from 'path'
import { getWorkspacePath } from '@mandrake/types'

export interface FileChangeEvent {
    type: 'add' | 'change' | 'unlink'
    filename: string
    workspace: string
}

export class FileWatcherService {
    private watchers: Map<string, ReturnType<typeof watch>> = new Map()
    private onEvent: (event: FileChangeEvent) => Promise<void>

    constructor(onEvent: (event: FileChangeEvent) => Promise<void>) {
        this.onEvent = onEvent
    }

    watchWorkspace(workspaceName: string) {
        const paths = getWorkspacePath(workspaceName)
        const contextFilesPath = paths.contextFiles

        const watcher = watch(contextFilesPath, { recursive: true }, (eventType, filename) => {
            if (filename) {
                const event: FileChangeEvent = {
                    type: eventType === 'rename' ? 'add' : 'change',
                    filename,
                    workspace: workspaceName
                }
                this.onEvent(event)
            }
        })

        this.watchers.set(workspaceName, watcher)
        return () => {
            watcher.close()
            this.watchers.delete(workspaceName)
        }
    }

    cleanup() {
        this.watchers.forEach(watcher => watcher.close())
        this.watchers.clear()
    }
}