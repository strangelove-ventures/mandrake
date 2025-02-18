import { XmlTags, wrapWithXmlTag } from '../types';
import type { PromptSection, ToolsSectionConfig } from '../types';

export class ToolsSection implements PromptSection {
  constructor(private readonly config: ToolsSectionConfig) {}

  build(): string {
    if (!this.config.tools || this.config.tools.length === 0) {
      return '';
    }

    const toolsContent = this.config.tools
      .map(tool => {
        return wrapWithXmlTag(XmlTags.TOOL, [
          `name: ${tool.name}`,
          `description: ${tool.description}`,
          tool.inputSchema ? `schema: ${JSON.stringify(tool.inputSchema, null, 2)}` : ''
        ].filter(Boolean).join('\n'));
      })
      .join('\n\n');

    return wrapWithXmlTag(XmlTags.TOOLS, toolsContent);
  }
}