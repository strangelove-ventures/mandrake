'use client';

import { useState, useEffect } from 'react';
import { useSystemStore } from '@/stores';

export default function SystemConfig() {
  const { settings, loadSettings, updateSettings, isLoading, error } = useSystemStore();
  
  // Form state
  const [formState, setFormState] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    telemetry: true,
    metadata: {} as Record<string, string>,
  });
  
  // State for new metadata entry
  const [newMetadataKey, setNewMetadataKey] = useState('');
  const [newMetadataValue, setNewMetadataValue] = useState('');
  
  // Load settings when component mounts
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  // Update form state when settings change
  useEffect(() => {
    if (settings) {
      setFormState({
        theme: settings.theme || 'system',
        telemetry: settings.telemetry ?? true,
        metadata: settings.metadata || {},
      });
    }
  }, [settings]);
  
  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };
  
  // Handle metadata changes
  const handleAddMetadata = () => {
    if (!newMetadataKey.trim()) return;
    
    setFormState(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [newMetadataKey]: newMetadataValue
      }
    }));
    
    // Clear inputs
    setNewMetadataKey('');
    setNewMetadataValue('');
  };
  
  // Remove metadata entry
  const handleRemoveMetadata = (key: string) => {
    setFormState(prev => {
      const updatedMetadata = { ...prev.metadata };
      delete updatedMetadata[key];
      
      return {
        ...prev,
        metadata: updatedMetadata
      };
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting form with state:', formState);
    
    try {
      await updateSettings(formState);
      console.log('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };
  
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              Theme
            </label>
            <select
              name="theme"
              value={formState.theme}
              onChange={handleChange}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System (Auto)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Controls the UI appearance
            </p>
          </div>
          
          <div>
            <label className="flex items-center text-sm font-medium mb-1 space-x-2">
              <input
                type="checkbox"
                name="telemetry"
                checked={formState.telemetry}
                onChange={handleChange}
                className="rounded"
              />
              <span>Enable Telemetry</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-5">
              Help improve Mandrake by sharing anonymous usage data
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Metadata
            </label>
            
            <div className="border rounded dark:border-gray-700 overflow-hidden mb-2">
              {Object.keys(formState.metadata).length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="py-2 px-3 text-left">Key</th>
                      <th className="py-2 px-3 text-left">Value</th>
                      <th className="py-2 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(formState.metadata).map(([key, value]) => (
                      <tr key={key} className="border-t dark:border-gray-700">
                        <td className="py-2 px-3 font-medium">{key}</td>
                        <td className="py-2 px-3">{value}</td>
                        <td className="py-2 px-3">
                          <button 
                            type="button"
                            onClick={() => handleRemoveMetadata(key)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-3 text-gray-500 text-center">
                  No metadata entries
                </div>
              )}
            </div>
            
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Key</label>
                <input
                  type="text"
                  value={newMetadataKey}
                  onChange={(e) => setNewMetadataKey(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  placeholder="key"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Value</label>
                <input
                  type="text"
                  value={newMetadataValue}
                  onChange={(e) => setNewMetadataValue(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  placeholder="value"
                />
              </div>
              <button
                type="button"
                onClick={handleAddMetadata}
                disabled={!newMetadataKey.trim()}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
