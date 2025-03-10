'use client';

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ToolsConfig } from './types';

interface ConfigListProps {
  toolsData: ToolsConfig;
  selectedConfigId: string | null;
  onSelectConfig: (configId: string) => void;
}

/**
 * Displays a dropdown for selecting tool configurations
 */
export default function ConfigList({ toolsData, selectedConfigId, onSelectConfig }: ConfigListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tool Configuration</CardTitle>
        <CardDescription>Select the active tool configuration</CardDescription>
      </CardHeader>
      <CardContent>
        <Select 
          value={selectedConfigId || ''} 
          onValueChange={onSelectConfig}
        >
          <SelectTrigger className="w-full">
            <div className="flex items-center justify-between w-full">
              <SelectValue placeholder="Select a configuration" />
              {selectedConfigId === toolsData.active && (
                <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                  Active
                </Badge>
              )}
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.keys(toolsData.configs).map(configId => (
              <SelectItem key={configId} value={configId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {configId}
                  {configId === toolsData.active && (
                    <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                      Active
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
