import { expect, test, describe } from "bun:test";
import { DefaultDockerMCPService } from "../src";

describe("DockerMCPService", () => {
  test("should create Docker MCP service", () => {
    const service = new DefaultDockerMCPService();
    expect(service).toBeDefined();
  });
});