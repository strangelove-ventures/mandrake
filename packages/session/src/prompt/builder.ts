import type { 
  PromptBuilder, 
  ToolsSectionConfig, 
  MetadataSectionConfig,
  SystemInfoSectionConfig,
  DateSectionConfig,
  FilesSectionConfig,
  DynamicContextSectionConfig
} from './types';

import {
  XmlTags,
  wrapWithXmlTag
} from './types';


import {
  ToolsSection,
  MetadataSection,
  SystemSection,
  DateSection,
  FilesSection,
  DynamicContextSection
} from './sections';

export interface SystemPromptBuilderConfig {
  instructions: string;
  tools?: ToolsSectionConfig;
  metadata?: MetadataSectionConfig;
  systemInfo?: SystemInfoSectionConfig;
  dateConfig?: DateSectionConfig;
  files?: FilesSectionConfig;
  dynamicContext?: DynamicContextSectionConfig;
}

export class SystemPromptBuilder implements PromptBuilder {
  private sections: string[] = [];

  constructor(private readonly config: SystemPromptBuilderConfig) {
    // Instructions are always included
    this.sections.push(
      wrapWithXmlTag(XmlTags.INSTRUCTIONS, config.instructions)
    );

    // Add optional sections if configured
    if (config.tools) {
      const toolsSection = new ToolsSection(config.tools);
      const toolsContent = toolsSection.build();
      if (toolsContent) {
        this.sections.push(toolsContent);
      }
    }

    if (config.files) {
      const filesSection = new FilesSection(config.files);
      const filesContent = filesSection.build();
      if (filesContent) {
        this.sections.push(filesContent);
      }
    }

    if (config.dynamicContext) {
      const dynamicSection = new DynamicContextSection(config.dynamicContext);
      const dynamicContent = dynamicSection.build();
      if (dynamicContent) {
        this.sections.push(dynamicContent);
      }
    }

    if (config.metadata) {
      const metadataSection = new MetadataSection(config.metadata);
      this.sections.push(metadataSection.build());
    }

    if (config.systemInfo) {
      const systemSection = new SystemSection(config.systemInfo);
      this.sections.push(systemSection.build());
    }

    const dateSection = new DateSection(config.dateConfig || {});
    this.sections.push(dateSection.build());
  }

  buildPrompt(): string {
    return this.sections.join('\n\n');
  }
}