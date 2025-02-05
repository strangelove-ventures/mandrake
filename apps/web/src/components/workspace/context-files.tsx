import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Upload, File, FileJson, FileImage, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import ReactMarkdown from 'react-markdown'
import type { ContextFile } from '@mandrake/types'

// FileViewer component remains the same...
function FileViewer({ content, fileType }: { content: string, fileType: string }) {
    const displayContent = content.trim()

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
        <pre className="p-4 text-sm bg-muted rounded-md whitespace-pre-wrap font-mono">
            {displayContent}
        </pre>
    )
}

// Helpers remain the same...
function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
}

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

// New AddFileDialog component
function AddFileDialog() {
    const { currentWorkspace } = useWorkspaceStore()
    const [isOpen, setIsOpen] = useState(false)
    const [fileName, setFileName] = useState('')
    const [content, setContent] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id || !fileName) return

        try {
            const response = await fetch(`/api/workspace/${currentWorkspace.id}/context/files/${encodeURIComponent(fileName)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content }),
            })

            if (response.ok) {
                setIsOpen(false)
                setFileName('')
                setContent('')
            }
        } catch (error) {
            console.error('Failed to create file:', error)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add File
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New File</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Input
                            placeholder="File name (with extension)"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <textarea
                            className="w-full h-64 p-2 border rounded-md overflow-x-auto whitespace-pre font-mono"
                            placeholder="File content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit">Create File</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export function ContextFiles({ className }: { className?: string }) {
    const { currentWorkspace, currentFiles, startWatchingFiles, stopWatchingFiles } = useWorkspaceStore()
    const [selectedFile, setSelectedFile] = useState<ContextFile | null>(null)
    const [fileContent, setFileContent] = useState<string>('')
    const [isExpanded, setIsExpanded] = useState(false)

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
            <CardHeader
                className="flex flex-row items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <CardTitle>Context Files</CardTitle>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <AddFileDialog />
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        multiple
                        onChange={handleFileUpload}
                    />
                    <Button size="sm" variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Files
                    </Button>
                </div>
            </CardHeader>
            {isExpanded && (
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
            )}

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