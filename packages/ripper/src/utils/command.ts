import { spawn } from 'child_process';
import { RipperError, ErrorCode } from './errors';

export interface CommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  requiresApproval?: boolean;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * Execute a command with safety checks
 * @throws {RipperError} if command fails or is invalid
 */
export async function executeCommand(
  command: string,
  options: CommandOptions = {}
): Promise<CommandResult> {
  // Validate command before execution
  validateCommand(command);

  return new Promise<CommandResult>((resolve, reject) => {
    const proc = spawn('bash', ['-c', command], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      reject(new RipperError(
        `Failed to execute command: ${error.message}`,
        ErrorCode.COMMAND_ERROR,
        error
      ));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new RipperError(
          `Command failed with code ${code}: ${stderr}`,
          ErrorCode.COMMAND_ERROR
        ));
        return;
      }

      resolve({
        stdout,
        stderr,
        code: code ?? 0
      });
    });
  });
}

const UNSAFE_PATTERNS = [
  /rm\s+(-rf?|--recursive|--force)/i,  // Dangerous rm commands
  />[>&]?/,                           // Output redirection
  /\|\s*sudo/i,                       // Piping to sudo 
  /sudo/i,                            // Direct sudo use
  /mkfs/i,                            // Filesystem formatting
  /dd/i,                              // Direct disk access
  /shutdown|reboot|halt/i,            // System control
  /chmod\s+[0-7]*7[0-7]*/i,          // Setting dangerous permissions
];

/**
 * Validate a command for safety
 * @throws {RipperError} if command contains unsafe patterns
 */
export function validateCommand(command: string): void {
  const unsafe = UNSAFE_PATTERNS.find(pattern => pattern.test(command));
  if (unsafe) {
    throw new RipperError(
      `Command contains unsafe pattern: ${unsafe.source}`,
      ErrorCode.VALIDATION_ERROR
    );
  }
}
