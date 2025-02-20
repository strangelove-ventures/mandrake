import { spawn } from 'child_process';
import { RipperError, ErrorCode } from './errors';
import { stat } from 'fs/promises';
import { resolve as pathResolve } from 'path'; // Rename to avoid confusion

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


export async function executeCommand(
  command: string,
  options: CommandOptions = {}
): Promise<CommandResult> {
  validateCommand(command);

  // If cwd specified, validate it exists and is a directory
  if (options.cwd) {
    try {
      const stats = await stat(options.cwd);
      if (!stats.isDirectory()) {
        throw new RipperError(
          `Working directory is not a directory: ${options.cwd}`,
          ErrorCode.COMMAND_ERROR
        );
      }
    } catch (error) {
      throw new RipperError(
        `Working directory does not exist: ${options.cwd}`,
        ErrorCode.COMMAND_ERROR
      );
    }
  }

  return new Promise<CommandResult>((resolve, reject) => {
    const proc = spawn('bash', ['-c', command], {
      cwd: options.cwd ? pathResolve(options.cwd) : undefined,
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