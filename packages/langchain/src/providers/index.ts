import { LLMProvider, LLMProviderConfig } from "./base";
import { AnthropicProvider } from "./anthropic";
import { DeepseekProvider } from "./deepseek";

export type ProviderType = "anthropic" | "deepseek";

export function createProvider(type: ProviderType, config: LLMProviderConfig): LLMProvider {
    switch (type) {
        case "anthropic":
            return new AnthropicProvider(config);
        case "deepseek":
            return new DeepseekProvider(config);
        default:
            throw new Error(`Unknown provider type: ${type}`);
    }
}

export { LLMProvider, LLMProviderConfig } from "./base";
