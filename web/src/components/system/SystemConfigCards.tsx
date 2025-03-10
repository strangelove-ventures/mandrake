/**
 * System configuration cards component for the landing page
 */
'use client';

import Link from 'next/link';
import { useSystemStore, useToolsStore, useModelsStore } from '@/stores';
import { useEffect } from 'react';

export default function SystemConfigCards() {
  // Load system configuration data
  const { settings, loadSettings } = useSystemStore();
  const { activeToolsId, loadActiveTools } = useToolsStore();
  const { activeModelId, loadActiveModel } = useModelsStore();
  
  // Load data on mount
  useEffect(() => {
    loadSettings();
    loadActiveTools();
    loadActiveModel();
  }, [loadSettings, loadActiveTools, loadActiveModel]);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold mb-4">System Configuration</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tools Config Card */}
        <Link href="/config/tools">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-1">Tools</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure available tools and commands
            </p>
            {activeToolsId && (
              <div className="mt-2 text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded inline-block">
                Active: {activeToolsId.substring(0, 8)}
              </div>
            )}
          </div>
        </Link>
        
        {/* Models Config Card */}
        <Link href="/config/models">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
            <h3 className="font-medium text-purple-700 dark:text-purple-300 mb-1">Models</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure AI models and providers
            </p>
            {activeModelId && (
              <div className="mt-2 text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded inline-block">
                Active: {activeModelId.substring(0, 8)}
              </div>
            )}
          </div>
        </Link>
        
        {/* Prompt Config Card */}
        <Link href="/config/prompt">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
            <h3 className="font-medium text-green-700 dark:text-green-300 mb-1">Prompt</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Customize system prompts and instructions
            </p>
          </div>
        </Link>
        
        {/* Mandrake Config Card */}
        <Link href="/config/system">
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
            <h3 className="font-medium text-amber-700 dark:text-amber-300 mb-1">System</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage general Mandrake settings
            </p>
            {settings && (
              <div className="mt-2 text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-1 rounded inline-block">
                Log Level: {settings.logLevel}
              </div>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
