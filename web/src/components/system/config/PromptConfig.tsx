'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
}

export default function PromptConfig() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  
  // Load prompt templates
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // This is a placeholder - replace with actual API call when available
      // const response = await api.prompt.list();
      
      // For now, using dummy data
      const dummyData: PromptTemplate[] = [
        {
          id: 'default',
          name: 'Default System Prompt',
          content: 'You are an AI assistant powered by Mandrake. You have access to user files and code within their workspace. You can use tools when needed to access information or perform tasks.',
          isActive: true
        },
        {
          id: 'developer',
          name: 'Developer Assistant',
          content: 'You are an AI developer assistant powered by Mandrake. Your primary role is to help with coding tasks, including debugging, writing code, and explaining concepts.',
          isActive: false
        }
      ];
      
      setTemplates(dummyData);
      
      // Set first template as selected by default
      if (dummyData.length > 0) {
        setSelectedTemplate(dummyData[0]);
        setEditedContent(dummyData[0].content);
      }
    } catch (err) {
      setError('Failed to load prompt templates');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load templates when component mounts
  useEffect(() => {
    loadTemplates();
  }, []);
  
  // Handle template selection
  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setEditedContent(template.content);
  };
  
  // Handle saving changes
  const handleSave = async () => {
    if (!selectedTemplate) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // This is a placeholder - replace with actual API call when available
      // await api.prompt.update(selectedTemplate.id, { content: editedContent });
      
      // Update local state
      setTemplates(prevTemplates => 
        prevTemplates.map(template => 
          template.id === selectedTemplate.id 
            ? { ...template, content: editedContent } 
            : template
        )
      );
      
      setSelectedTemplate(prev => prev ? { ...prev, content: editedContent } : null);
      
    } catch (err) {
      setError('Failed to save changes');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle activating a template
  const handleActivate = async () => {
    if (!selectedTemplate) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // This is a placeholder - replace with actual API call when available
      // await api.prompt.setActive(selectedTemplate.id);
      
      // Update local state
      setTemplates(prevTemplates => 
        prevTemplates.map(template => ({
          ...template,
          isActive: template.id === selectedTemplate.id
        }))
      );
      
      setSelectedTemplate(prev => prev ? { ...prev, isActive: true } : null);
      
    } catch (err) {
      setError('Failed to activate template');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Prompt templates list */}
        <div className="md:col-span-1 border dark:border-gray-700 rounded">
          <h3 className="p-3 border-b dark:border-gray-700 font-medium">Prompt Templates</h3>
          {templates.length === 0 ? (
            <div className="p-4 text-gray-500">No templates found</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {templates.map(template => (
                <div 
                  key={template.id} 
                  className={`p-3 border-b dark:border-gray-700 last:border-b-0 cursor-pointer ${
                    selectedTemplate?.id === template.id 
                      ? 'bg-green-50 dark:bg-green-900/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="font-medium">{template.name}</div>
                  {template.isActive && (
                    <div className="mt-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 py-0.5 px-2 rounded inline-block">
                      Active
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Prompt editor */}
        <div className="md:col-span-2">
          {selectedTemplate ? (
            <div className="border dark:border-gray-700 rounded">
              <div className="p-3 border-b dark:border-gray-700 font-medium flex justify-between items-center">
                <span>Editing: {selectedTemplate.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isLoading || selectedTemplate.content === editedContent}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    Save
                  </button>
                  
                  {!selectedTemplate.isActive && (
                    <button
                      onClick={handleActivate}
                      disabled={isLoading}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-64 p-3 border rounded font-mono text-sm dark:bg-gray-700 dark:border-gray-600"
                />
                
                <div className="text-sm text-gray-500 mt-2">
                  This prompt will be used as the system prompt for new conversations.
                </div>
              </div>
            </div>
          ) : (
            <div className="border dark:border-gray-700 rounded p-4 text-gray-500">
              Select a template to edit
            </div>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
