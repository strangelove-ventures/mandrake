'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore } from '@/lib/stores/workspace'
import { ServerMethodSelector } from './ServerMethodSelector'
import { MethodConfigForm } from './MethodConfigForm'
import type { DynamicContextMethodConfig } from '@mandrake/types'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type Step = 'select-method' | 'configure-params'

export function AddDynamicContextDialog({ open, onOpenChange }: Props) {
    const [step, setStep] = useState<Step>('select-method')
    const [selectedServer, setSelectedServer] = useState<string>('')
    const [selectedMethod, setSelectedMethod] = useState<string>('')
    const { currentWorkspace, addDynamicContext } = useWorkspaceStore()

    const handleServerMethodSelect = (serverId: string, method: string) => {
        setSelectedServer(serverId)
        setSelectedMethod(method)
        setStep('configure-params')
    }

    const handleSubmit = async (params: Record<string, any>) => {
        if (!currentWorkspace) return

        const config: Omit<DynamicContextMethodConfig, 'id'> = {
            serverId: selectedServer,
            methodName: selectedMethod,
            params,
            refresh: {
                enabled: false
            }
        }

        await addDynamicContext(currentWorkspace.id, config)
        onOpenChange(false)
        // Reset state
        setStep('select-method')
        setSelectedServer('')
        setSelectedMethod('')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'select-method'
                            ? 'Select Method'
                            : 'Configure Parameters'
                        }
                    </DialogTitle>
                </DialogHeader>

                {step === 'select-method' ? (
                    <ServerMethodSelector
                        onSelect={handleServerMethodSelect}
                    />
                ) : (
                    <MethodConfigForm
                        serverId={selectedServer}
                        method={selectedMethod}
                        onSubmit={handleSubmit}
                        onBack={() => setStep('select-method')}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}