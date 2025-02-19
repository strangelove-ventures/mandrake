import { XmlTags, wrapWithXmlTag } from '../types';
import type { PromptSection, FilesSectionConfig } from '../types';

export class FilesSection implements PromptSection {
    constructor(private readonly config: FilesSectionConfig) { }

    build(): string {
        if (!this.config.files || this.config.files.length === 0) {
            return '';
        }

        const filesContent = this.config.files
            .map(file => {
                return wrapWithXmlTag(XmlTags.FILE,
                    `name: ${file.name}\n\ncontent:\n${file.content}`
                );
            })
            .join('\n\n');

        return wrapWithXmlTag(XmlTags.FILES, filesContent);
    }
}