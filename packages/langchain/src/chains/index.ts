export interface Chain {
  execute(input: string): Promise<string>;
}
