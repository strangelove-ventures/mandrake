import type { PromptSection, FilesSectionConfig } from '../types';
import { formatMarkdownSection, SectionTitles } from '../types';

export class FilesSection implements PromptSection {
    constructor(private readonly config: FilesSectionConfig) { }

    build(): string {
        if (!this.config.files || this.config.files.length === 0) {
            return '';
        }

        const filesContent = this.config.files
            .map(file => {
                return `### ${file.name}\n\n\`\`\`\n${file.content}\n\`\`\``;
            })
            .join('\n\n');
        
        return formatMarkdownSection(SectionTitles.FILES, filesContent);
    }
}