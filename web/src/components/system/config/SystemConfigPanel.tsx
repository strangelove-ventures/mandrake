'use client';

import { useState } from 'react';
import ToolsConfig from './ToolsConfig';
import ModelsConfig from './ModelsConfig';
import PromptConfig from './PromptConfig';
import SystemConfig from './SystemConfig';

type ConfigTab = 'tools' | 'models' | 'prompt' | 'system';

export default function SystemConfigPanel() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('system');
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-xl font-semibold">System Configuration</h2>
      </div>
      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700">
        <TabButton 
          label="System" 
          active={activeTab === 'system'} 
          onClick={() => setActiveTab('system')}
          color="amber"
        />
        <TabButton 
          label="Tools" 
          active={activeTab === 'tools'} 
          onClick={() => setActiveTab('tools')}
          color="blue"
        />
        <TabButton 
          label="Models" 
          active={activeTab === 'models'} 
          onClick={() => setActiveTab('models')}
          color="purple"
        />
        <TabButton 
          label="Prompt" 
          active={activeTab === 'prompt'} 
          onClick={() => setActiveTab('prompt')}
          color="green"
        />
      </div>
      
      {/* Content */}
      <div className="p-6">
        {activeTab === 'system' && <SystemConfig />}
        {activeTab === 'tools' && <ToolsConfig />}
        {activeTab === 'models' && <ModelsConfig />}
        {activeTab === 'prompt' && <PromptConfig />}
      </div>
    </div>
  );
}

// Helper component for tab buttons
interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  color: 'blue' | 'purple' | 'green' | 'amber';
}

function TabButton({ label, active, onClick, color }: TabButtonProps) {
  // Color styles based on the provided color
  const colorStyles = {
    blue: {
      active: 'text-blue-600 dark:text-blue-400 border-blue-500',
      hover: 'hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300'
    },
    purple: {
      active: 'text-purple-600 dark:text-purple-400 border-purple-500',
      hover: 'hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300'
    },
    green: {
      active: 'text-green-600 dark:text-green-400 border-green-500',
      hover: 'hover:text-green-600 dark:hover:text-green-400 hover:border-green-300'
    },
    amber: {
      active: 'text-amber-600 dark:text-amber-400 border-amber-500',
      hover: 'hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300'
    }
  };
  
  return (
    <button
      className={`py-3 px-4 font-medium border-b-2 -mb-px transition-colors ${
        active 
          ? `${colorStyles[color].active}` 
          : `border-transparent text-gray-500 ${colorStyles[color].hover}`
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
