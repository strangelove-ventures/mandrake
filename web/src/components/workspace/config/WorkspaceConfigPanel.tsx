'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import ToolsConfig from './ToolsConfig';
import FilesConfig from './FilesConfig';
import DynamicContextConfig from './DynamicContextConfig';
import PromptConfig from './PromptConfig';
import WorkspaceConfig from './WorkspaceConfig';
import ModelsConfig from './ModelsConfig';

interface WorkspaceConfigPanelProps {
  workspaceId: string;
}

export default function WorkspaceConfigPanel({ workspaceId }: WorkspaceConfigPanelProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-xl font-semibold">Workspace Configuration</h2>
      </div>
      
      <div className="p-4">
        <Accordion type="multiple" className="w-full">
          <ConfigSection value="workspace" title="Workspace" icon="🏢">
            <WorkspaceConfig workspaceId={workspaceId} />
          </ConfigSection>
          
          <ConfigSection value="tools" title="Tools" icon="🛠️">
            <ToolsConfig workspaceId={workspaceId} />
          </ConfigSection>
          
          <ConfigSection value="models" title="Models" icon="🤖">
            <ModelsConfig workspaceId={workspaceId} />
          </ConfigSection>
          
          <ConfigSection value="files" title="Files" icon="📁">
            <FilesConfig workspaceId={workspaceId} />
          </ConfigSection>
          
          <ConfigSection value="dynamic" title="Dynamic Context" icon="🔄">
            <DynamicContextConfig workspaceId={workspaceId} />
          </ConfigSection>
          
          <ConfigSection value="prompt" title="Prompt" icon="💬">
            <PromptConfig workspaceId={workspaceId} />
          </ConfigSection>
        </Accordion>
      </div>
    </div>
  );
}

interface ConfigSectionProps {
  value: string;
  title: string;
  icon: string;
  children: React.ReactNode;
}

function ConfigSection({ value, title, icon, children }: ConfigSectionProps) {
  return (
    <AccordionItem value={value} className="border-b border-gray-200 dark:border-gray-700">
      <AccordionTrigger className="py-4">
        <span className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span>{title}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="p-2">
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
