import type { ContextSection, SystemInfoSectionConfig } from '../types';
import { formatMarkdownSection, SectionTitles } from '../types';

export class SystemSection implements ContextSection {
  constructor(private readonly config: SystemInfoSectionConfig) { }

  getContextString(): string {
    const os = `Operating System: ${this.config.os}.${this.config.arch}`;
    // TODO: more system info here
    return [
      os
    ].filter(Boolean).join('\n');
  }

  build(): string {
    return formatMarkdownSection(SectionTitles.SYSTEM, this.getContextString());
  }
}