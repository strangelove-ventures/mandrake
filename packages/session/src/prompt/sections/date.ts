import type { PromptSection, DateSectionConfig } from '../types';
import { formatMarkdownSection, SectionTitles } from '../types';

export class DateSection implements PromptSection {
  constructor(private readonly config: DateSectionConfig = {}) {}

  build(): string {
    const now = new Date();
    const dateStr = this.config.includeTime 
      ? now.toISOString()
      : now.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
    
    return formatMarkdownSection(SectionTitles.DATETIME, dateStr);
  }
}