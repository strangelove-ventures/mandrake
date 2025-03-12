import type { ContextSection, MetadataSectionConfig } from '../types';
import { formatMarkdownSection, SectionTitles } from '../types';

export class MetadataSection implements ContextSection {
  constructor(private readonly config: MetadataSectionConfig) {}

  getContextString(): string {
    return [
      `name: ${this.config.workspaceName}`,
      `path: ${this.config.workspacePath}`,
      // Add other metadata fields here as we expand
    ].join('\n');
  }

  build(): string {
    return formatMarkdownSection(SectionTitles.WORKSPACE, this.getContextString());
  }
}