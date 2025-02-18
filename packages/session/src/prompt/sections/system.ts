import { XmlTags, wrapWithXmlTag } from '../types';
import type { ContextSection, SystemInfoSectionConfig } from '../types';

export class SystemSection implements ContextSection {
  constructor(private readonly config: SystemInfoSectionConfig) {}

  getContextString(): string {
    return [
      `os: ${this.config.os}`,
      `arch: ${this.config.arch}`,
      // Add other system info fields here as we expand
    ].join('\n');
  }

  build(): string {
    return wrapWithXmlTag(XmlTags.SYSTEM, this.getContextString());
  }
}