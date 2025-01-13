export interface MCPServer {
  connect(): Promise<void>;
  invoke(input: string): Promise<string>;
}
