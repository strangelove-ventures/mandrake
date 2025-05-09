'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import ToolsConfig from './ToolsConfig';
import ModelsConfig from './ModelsConfig';
import PromptConfig from './PromptConfig';
import SystemConfig from './SystemConfig';

export default function SystemConfigPanel() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-xl font-semibold">System Configuration</h2>
      </div>
      
      <div className="p-4">
        <Accordion type="multiple" className="w-full">
          <ConfigSection value="system" title="System Settings" icon="⚙️">
            <SystemConfig />
          </ConfigSection>
          
          <ConfigSection value="tools" title="Tools" icon="🛠️">
            <ToolsConfig />
          </ConfigSection>
          
          <ConfigSection value="models" title="Models" icon="🤖">
            <ModelsConfig />
          </ConfigSection>
          
          <ConfigSection value="prompt" title="Prompt" icon="💬">
            <PromptConfig />
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
