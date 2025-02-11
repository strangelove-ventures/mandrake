// src/service.ts
import { buildApiHandler, ApiHandler } from '@cline/api';
import { ApiConfiguration } from '@cline/shared/api';
import { MCPService } from '@mandrake/types';
import { ApiStreamChunk } from '@cline/api/transform/stream';

export class ProviderService {
    private handler: ApiHandler;
    private mcpService: MCPService;

    constructor(config: ApiConfiguration, mcpService: MCPService) {
        this.handler = buildApiHandler(config);
        this.mcpService = mcpService;
    }

    async processMessage(systemPrompt: string, messages: any[]) {
        const model = this.handler.getModel();
        const tools = await this.mcpService.getTools();

        const stream = await this.handler.createMessage(
            systemPrompt,
            messages,
            tools
        );

        const chunks: ApiStreamChunk[] = [];
        let usage = {
            totalCost: 0,
            inputTokens: 0,
            outputTokens: 0
        };

        for await (const chunk of stream) {
            chunks.push(chunk);

            if (chunk.type === "usage") {
                // Update usage stats
                usage.inputTokens += chunk.inputTokens;
                usage.outputTokens += chunk.outputTokens;
            }
        }

        return {
            chunks,
            usage,
            model: model.id
        };
    }
}