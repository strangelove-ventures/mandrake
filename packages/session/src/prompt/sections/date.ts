import { XmlTags, wrapWithXmlTag } from '../types';
import type { PromptSection, DateSectionConfig } from '../types';

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
    
    return wrapWithXmlTag(XmlTags.DATETIME, dateStr);
  }
}