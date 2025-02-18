import { XmlTags, wrapWithXmlTag } from '../types';
import type { ContextSection, MetadataSectionConfig } from '../types';

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
    return wrapWithXmlTag(XmlTags.WORKSPACE, this.getContextString());
  }
}