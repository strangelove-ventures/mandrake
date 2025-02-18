import { describe, test, expect } from "bun:test";
import { parseProviderMessage } from "../../src/stream/parser";

describe("parseProviderMessage", () => {
  test("parses plain text", () => {
    const input = "Hello world";
    const blocks = parseProviderMessage(input);
    expect(blocks).toEqual([{
      type: "text",
      content: "Hello world",
      partial: true
    }]);
  });

  test("parses simple tool call", () => {
    const input = `<read_file>
<path>test.txt</path>
</read_file>`;
    const blocks = parseProviderMessage(input);
    expect(blocks).toEqual([{
      type: "tool",
      toolName: "read_file",
      toolParams: {
        path: "test.txt"
      },
      partial: false
    }]);
  });

  test("parses mixed content", () => {
    const input = `Here's the file content:
<read_file>
<path>test.txt</path>
</read_file>
And here's what we'll do with it.`;
    
    const blocks = parseProviderMessage(input);
    expect(blocks).toEqual([
      {
        type: "text",
        content: "Here's the file content:",
        partial: false
      },
      {
        type: "tool",
        toolName: "read_file",
        toolParams: {
          path: "test.txt"
        },
        partial: false
      },
      {
        type: "text",
        content: "And here's what we'll do with it.",
        partial: true
      }
    ]);
  });

  test("handles write_to_file content parameter", () => {
    const input = `<write_to_file>
<path>test.txt</path>
<content>
Hello world
This is a test
</content>
</write_to_file>`;
    
    const blocks = parseProviderMessage(input);
    expect(blocks).toEqual([{
      type: "tool",
      toolName: "write_to_file",
      toolParams: {
        path: "test.txt",
        content: "Hello world\nThis is a test"
      },
      partial: false
    }]);
  });

  test("handles write_to_file with content containing tool tags", () => {
    const input = `<write_to_file>
<path>test.txt</path>
<content>
function test() {
  // </content> in a comment
  return true;
}
</content>
</write_to_file>`;
    
    const blocks = parseProviderMessage(input);
    expect(blocks).toEqual([{
      type: "tool",
      toolName: "write_to_file",
      toolParams: {
        path: "test.txt",
        content: 'function test() {\n  // </content> in a comment\n  return true;\n}'
      },
      partial: false
    }]);
  });

  test("handles partial tool calls - incomplete tag", () => {
    const input = `<read_file`;
    const blocks = parseProviderMessage(input);
    expect(blocks).toEqual([{
      type: "text",
      content: "<read_file",
      partial: true
    }]);
  });

  test("handles partial tool calls - no params", () => {
    const input = `<read_file>`;
    const blocks = parseProviderMessage(input);
    expect(blocks).toEqual([{
      type: "tool",
      toolName: "read_file",
      toolParams: {},
      partial: true
    }]);
  });

  test("handles partial tool calls - incomplete param", () => {
    const input = `<read_file>
<path>test.txt`;
    const blocks = parseProviderMessage(input);
    expect(blocks).toEqual([{
      type: "tool",
      toolName: "read_file",
      toolParams: {
        path: "test.txt"
      },
      partial: true
    }]);
  });

  test("parses mcp tool calls", () => {
    const input = `<use_mcp_tool>
<server_name>git</server_name>
<tool_name>status</tool_name>
<arguments>
{
  "path": "."
}
</arguments>
</use_mcp_tool>`;
    
    const blocks = parseProviderMessage(input);
    expect(blocks).toEqual([{
      type: "tool",
      toolName: "use_mcp_tool",
      toolParams: {
        server_name: "git",
        tool_name: "status",
        arguments: '{\n  "path": "."\n}'
      },
      partial: false
    }]);
  });
});