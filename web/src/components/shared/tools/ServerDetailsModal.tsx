/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ServerConfig } from './types';
import ServerMethodsList from './ServerMethodsList';
import MethodExecutionPanel from './MethodExecutionPanel';
import StableModal from './StableModal';
import { api } from '@/lib/api';

interface ServerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  config: ServerConfig;
  onEdit: () => void;
  isWorkspace?: boolean;
  workspaceId?: string;
}

export default function ServerDetailsModal({
  isOpen,
  onClose,
  serverId,
  workspaceId
}: ServerDetailsModalProps) {
  const [currentMethodName, setCurrentMethodName] = useState<string | null>(null);
  const [methodDetails, setMethodDetails] = useState<any | null>(null);
  const [refreshing] = useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const isMounted = useRef(true);
  
  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened - status loading DISABLED');
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [isOpen]);
  
  useEffect(() => {
    if (!isOpen) {
      setShowExecutionPanel(false);
      setCurrentMethodName(null);
      setMethodDetails(null);
    }
  }, [isOpen]);
  
  // Handle method selection - direct implementation that doesn't use the store's selectMethod
  const handleSelectMethod = async (methodName: string) => {
    setCurrentMethodName(methodName);
    setShowExecutionPanel(true);
    
    try {
      // Fetch method details directly
      const details = await api.tools.getMethodDetails(serverId, methodName, workspaceId);
      if (isMounted.current) {
        setMethodDetails(details);
      }
    } catch (err) {
      console.error(`Failed to load details for method ${methodName}:`, err);
    }
  };
  
  // Handle back button click from execution panel
  const handleBackToMethods = () => {
    setShowExecutionPanel(false);
  };
  
  return (
    <StableModal 
      isOpen={isOpen} 
      onClose={onClose}
      className={`max-w-4xl ${showExecutionPanel ? 'max-h-[90vh]' : ''}`}
    >
      <div className="space-y-4">
        {!showExecutionPanel ? (
          // Methods List when not showing execution panel
          <ServerMethodsList 
            serverId={serverId} 
            onSelectMethod={handleSelectMethod} 
            isRefreshing={refreshing}
            workspaceId={workspaceId}
          />
        ) : (
          // Show execution panel when method is selected
          <>
            <div className="mb-4 flex justify-between items-center">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleBackToMethods}
              >
                ← Back to Methods
              </Button>
              
              <div className="text-lg font-medium">
                Execute: <span className="text-blue-600 dark:text-blue-400">{currentMethodName}</span>
              </div>
            </div>
            
            {currentMethodName && (
              <MethodExecutionPanel 
                serverId={serverId} 
                methodName={currentMethodName}
                methodDetails={methodDetails}
                workspaceId={workspaceId}
              />
            )}
          </>
        )}
      </div>
    </StableModal>
  );
}
