// apps/web/src/components/workspace/context-files.tsx
'use client'

import { useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Upload, File, FileJson, FileImage } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import ReactMarkdown from 'react-markdown'
import { useState } from 'react'
import type { ContextFile } from '@mandrake/types'

// File viewer component
function FileViewer({ content, fileType }: { content: string, fileType: string }) {
    // Handle text files with proper escaping
    const displayContent = content.trim() // Remove any trailing whitespace

    if (fileType === 'md' || fileType === 'markdown') {
        return (
            <div className="prose prose-sm dark:prose-invert max-w-none p-4">
                <ReactMarkdown>{displayContent}</ReactMarkdown>
            </div>
        )
    }

    // Handle shell/script files
    if (fileType === 'sh' || fileType === 'bash') {
        return (
            <SyntaxHighlighter
                language="bash"
                className="p-4 text-sm rounded-md"
                customStyle={{ margin: 0 }}
            >
                {displayContent}
            </SyntaxHighlighter>
        )
    }

    // Handle other code files
    const codeTypes = {
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'go': 'go',
        'json': 'json',
        'yaml': 'yaml',
        'toml': 'toml'
    }

    if (fileType in codeTypes) {
        return (
            <SyntaxHighlighter
                language={codeTypes[fileType as keyof typeof codeTypes]}
                className="p-4 text-sm rounded-md"
                customStyle={{ margin: 0 }}
            >
                {displayContent}
            </SyntaxHighlighter>
        )
    }

    // Plain text fallback
    return (
        <pre className="p-4 text-sm bg-muted rounded-md whitespace-pre font-mono">
            {displayContent}
        </pre>
    )
}

// Helper to format file size
function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
}

// Helper to get appropriate icon
function FileIcon({ type }: { type: string }) {
    switch (type.toLowerCase()) {
        case 'md':
        case 'markdown':
            return <FileText className="w-8 h-8" />
        case 'json':
            return <FileJson className="w-8 h-8" />
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
            return <FileImage className="w-8 h-8" />
        default:
            return <File className="w-8 h-8" />
    }
}

export function ContextFiles({ className }: { className?: string }) {
    const { currentWorkspace, currentFiles, startWatchingFiles, stopWatchingFiles } = useWorkspaceStore()
    const [selectedFile, setSelectedFile] = useState<ContextFile | null>(null)
    const [fileContent, setFileContent] = useState<string>('')

    useEffect(() => {
        if (currentWorkspace?.id) {
            startWatchingFiles(currentWorkspace.id)
            return () => stopWatchingFiles()
        }
    }, [currentWorkspace?.id])

    const handleFileClick = async (file: ContextFile) => {
        setSelectedFile(file)
        try {
            const response = await fetch(`/api/workspace/${currentWorkspace?.id}/context/files/${encodeURIComponent(file.name)}`)
            const content = await response.text()
            setFileContent(content)
        } catch (error) {
            console.error('Failed to load file content:', error)
        }
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || !currentWorkspace?.id) return

        const formData = new FormData()
        for (const file of event.target.files) {
            formData.append('files', file)
        }

        try {
            await fetch(`/api/workspace/${currentWorkspace.id}/context/files`, {
                method: 'POST',
                body: formData,
            })
        } catch (error) {
            console.error('Failed to upload files:', error)
        }
    }

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Context Files</CardTitle>
                <div>
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        multiple
                        onChange={handleFileUpload}
                    />
                    <Button size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Files
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {currentFiles.map(file => (
                        <Card
                            key={file.name}
                            className="p-4 hover:shadow-md cursor-pointer transition-shadow"
                            onClick={() => handleFileClick(file)}
                        >
                            <FileIcon type={file.type} />
                            <p className="text-sm font-medium mt-2 truncate" title={file.name}>
                                {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatSize(file.size)}
                            </p>
                        </Card>
                    ))}
                </div>
            </CardContent>

            {/* File Preview Dialog */}
            <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{selectedFile?.name}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh]">
                        {selectedFile && (
                            <FileViewer
                                content={fileContent}
                                fileType={selectedFile.type}
                            />
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </Card>
    )
}