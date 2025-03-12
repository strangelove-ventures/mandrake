import type { PromptSection, DynamicContextSectionConfig } from '../types';
import { formatMarkdownSection, SectionTitles } from '../types';

export class DynamicContextSection implements PromptSection {
    constructor(private readonly config: DynamicContextSectionConfig) { }

    build(): string {
        if (!this.config.dynamicContext || this.config.dynamicContext.length === 0) {
            return '';
        }

        const contextContent = this.config.dynamicContext
            .map(ctx => {
                return `### ${ctx.name}\n\n\`\`\`json\n${JSON.stringify(ctx.result, null, 2)}\n\`\`\``;
            })
            .join('\n\n');

        return formatMarkdownSection(SectionTitles.DYNAMIC_CONTEXTS, contextContent);
    }
}