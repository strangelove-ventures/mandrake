import { XmlTags, wrapWithXmlTag } from '../types';
import type { PromptSection, DynamicContextSectionConfig } from '../types';

export class DynamicContextSection implements PromptSection {
    constructor(private readonly config: DynamicContextSectionConfig) { }

    build(): string {
        if (!this.config.dynamicContext || this.config.dynamicContext.length === 0) {
            return '';
        }

        const contextContent = this.config.dynamicContext
            .map(ctx => {
                return wrapWithXmlTag(XmlTags.DYNAMIC_CONTEXT,
                    `name: ${ctx.name}\n\nresult:\n${JSON.stringify(ctx.result, null, 2)}`
                );
            })
            .join('\n\n');

        return wrapWithXmlTag(XmlTags.DYNAMIC_CONTEXTS, contextContent);
    }
}