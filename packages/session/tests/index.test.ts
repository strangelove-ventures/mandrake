import { expect, test, describe } from "bun:test";
import { DefaultSessionManager } from "../src";

describe("SessionManager", () => {
  test("should create session manager", () => {
    const manager = new DefaultSessionManager();
    expect(manager).toBeDefined();
  });
});