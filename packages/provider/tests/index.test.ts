import { expect, test, describe } from "bun:test";
import { DefaultProviderManager } from "../src";

describe("ProviderManager", () => {
  test("should create provider manager", () => {
    const manager = new DefaultProviderManager();
    expect(manager).toBeDefined();
  });
});