import { expect, test, describe, spyOn, beforeEach, afterEach } from "bun:test";
import { ConsoleLogger, createLogger, type Logger, type LogLevel } from "../src";

describe("ConsoleLogger", () => {
  const spies: Record<LogLevel | string, any> = {
    debug: undefined,
    info: undefined,
    warn: undefined,
    error: undefined,
  };

  beforeEach(() => {
    // Create fresh spies for each test
    spies.debug = spyOn(console, 'debug');
    spies.info = spyOn(console, 'info');
    spies.warn = spyOn(console, 'warn');
    spies.error = spyOn(console, 'error');
  });

  afterEach(() => {
    // Clear all spies
    spies.debug.mockClear();
    spies.info.mockClear();
    spies.warn.mockClear();
    spies.error.mockClear();
  });

  test("should create logger with default level (info)", () => {
    const logger = new ConsoleLogger();
    
    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");

    expect(spies.debug.mock.calls.length).toBe(0);
    expect(spies.info.mock.calls.length).toBe(1);
    expect(spies.warn.mock.calls.length).toBe(1);
    expect(spies.error.mock.calls.length).toBe(1);
  });

  test("should respect custom log level", () => {
    const logger = new ConsoleLogger({ level: 'warn' });
    
    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");

    expect(spies.debug.mock.calls.length).toBe(0);
    expect(spies.info.mock.calls.length).toBe(0);
    expect(spies.warn.mock.calls.length).toBe(1);
    expect(spies.error.mock.calls.length).toBe(1);
  });

  test("should include metadata in log output", () => {
    const logger = new ConsoleLogger({
      meta: { service: 'test-service' }
    });

    logger.info("test message");

    expect(spies.info).toHaveBeenCalledWith(
      '[INFO] test message',
      JSON.stringify({ service: 'test-service' })
    );
  });

  test("should merge metadata from constructor and method call", () => {
    const logger = new ConsoleLogger({
      meta: { service: 'test-service' }
    });

    logger.info("test message", { request_id: '123' });

    expect(spies.info).toHaveBeenCalledWith(
      '[INFO] test message',
      JSON.stringify({ service: 'test-service', request_id: '123' })
    );
  });

  test("should create child logger maintaining parent metadata", () => {
    const parent = new ConsoleLogger({
      meta: { service: 'parent-service' }
    });

    const child = parent.child({
      meta: { component: 'child-component' }
    });

    child.info("test message", { request_id: '123' });

    expect(spies.info).toHaveBeenCalledWith(
      '[INFO] test message',
      JSON.stringify({ 
        service: 'parent-service', 
        component: 'child-component',
        request_id: '123'
      })
    );
  });

  test("child logger should inherit parent level by default", () => {
    const parent = new ConsoleLogger({ level: 'warn' });
    const child = parent.child({});

    child.info("should not log");
    child.warn("should log");

    expect(spies.info.mock.calls.length).toBe(0);
    expect(spies.warn.mock.calls.length).toBe(1);
  });

  test("child logger should be able to override parent level", () => {
    const parent = new ConsoleLogger({ level: 'warn' });
    const child = parent.child({ level: 'info' });

    child.info("should log");
    child.warn("should also log");

    expect(spies.info.mock.calls.length).toBe(1);
    expect(spies.warn.mock.calls.length).toBe(1);
  });
});

describe("createLogger", () => {
  const spies: Record<LogLevel | string, any> = {
    debug: undefined,
    info: undefined,
    warn: undefined,
    error: undefined,
  };

  beforeEach(() => {
    // Create fresh spies for each test
    spies.debug = spyOn(console, 'debug');
    spies.info = spyOn(console, 'info');
    spies.warn = spyOn(console, 'warn');
    spies.error = spyOn(console, 'error');
  });

  afterEach(() => {
    // Clear all spies
    spies.debug.mockClear();
    spies.info.mockClear();
    spies.warn.mockClear();
    spies.error.mockClear();
  });

  test("should create package-specific logger", () => {
    const logger = createLogger('test-package');
    logger.info("test message");
    
    expect(spies.info).toHaveBeenCalledWith(
      '[INFO] test message',
      JSON.stringify({ package: 'test-package' })
    );
  });

  test("should allow additional metadata with package logger", () => {
    const logger = createLogger('test-package', {
      meta: { component: 'test-component' }
    });

    logger.info("test message", { request_id: '123' });
    
    expect(spies.info).toHaveBeenCalledWith(
      '[INFO] test message',
      JSON.stringify({ 
        package: 'test-package', 
        component: 'test-component',
        request_id: '123'
      })
    );
  });

  test("should support child loggers from package logger", () => {
    const logger = createLogger('test-package');
    const child = logger.child({
      meta: { component: 'child' }
    });

    child.info("test message");
    
    expect(spies.info).toHaveBeenCalledWith(
      '[INFO] test message',
      JSON.stringify({ 
        package: 'test-package', 
        component: 'child'
      })
    );
  });

  test("should use custom level in package logger", () => {
    const logger = createLogger('test-package', { level: 'warn' });
    
    logger.info("should not log");
    logger.warn("should log");

    expect(spies.info.mock.calls.length).toBe(0);
    expect(spies.warn.mock.calls.length).toBe(1);
  });
});