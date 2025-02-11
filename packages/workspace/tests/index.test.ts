import { expect, test, describe } from "bun:test";
import { DefaultWorkspaceManager } from "../src";

describe("WorkspaceManager", () => {
  test("should create workspace manager", () => {
    const manager = new DefaultWorkspaceManager();
    expect(manager).toBeDefined();
  });
});