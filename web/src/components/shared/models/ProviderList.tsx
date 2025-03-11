'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProviderConfig } from './types';

interface ProviderListProps {
  providers: Record<string, ProviderConfig>;
  selectedProviderId: string | null;
  onSelectProvider: (providerId: string) => void;
  onEditProvider: (providerId: string) => void;
  onToggleProviderEnabled: (providerId: string) => void;
  onAddProvider: () => void;
}

/**
 * Displays the list of available LLM providers
 */
export default function ProviderList({
  providers,
  selectedProviderId,
  onSelectProvider,
  onEditProvider,
  onToggleProviderEnabled,
  onAddProvider
}: ProviderListProps) {
  const providerIds = Object.keys(providers);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddProvider}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Provider
        </Button>
      </div>
      
      {providerIds.length === 0 ? (
        <div className="text-center p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            No providers configured. Add a provider to get started.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {providerIds.map(providerId => {
            const provider = providers[providerId];
            const isDisabled = provider.disabled === true;
            
            return (
              <li 
                key={providerId} 
                className={`p-3 border rounded-md flex justify-between items-center 
                  ${selectedProviderId === providerId ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} 
                  ${isDisabled ? 'opacity-60' : ''}`}
                onClick={() => !isDisabled && onSelectProvider(providerId)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`h-3 w-3 rounded-full ${isDisabled ? 'bg-gray-400' : 'bg-green-500'}`} 
                    title={isDisabled ? 'Disabled' : 'Enabled'} 
                  />
                  <div>
                    <span className="font-medium">{providerId}</span>
                    <div className="text-xs text-gray-500">
                      {provider.type} {provider.baseUrl ? `(${provider.baseUrl})` : ''}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Edit button */}
                  <div 
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer" 
                    title="Edit provider"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProvider(providerId);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                  </div>
                  
                  {/* API Key icon - if available */}
                  {provider.apiKey && (
                    <div 
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer text-yellow-600" 
                      title="API Key configured"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
