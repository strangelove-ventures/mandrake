'use server';

import { z } from 'zod';
import { ApiError, ErrorCode } from './errorHandling';

/**
 * Validate data against a Zod schema
 * @param data The data to validate
 * @param schema The Zod schema to validate against
 * @returns The validated data
 * @throws ApiError if validation fails
 */
export async function validateWithZod<T>(data: unknown, schema: z.ZodType<T>): Promise<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => {
        const path = err.path.join('.');
        return `${path ? `${path}: ` : ''}${err.message}`;
      }).join(', ');
      
      throw new ApiError(
        `Validation error: ${errorMessages}`,
        ErrorCode.VALIDATION_ERROR,
        400,
        error
      );
    }
    
    throw error;
  }
}

/**
 * Parse and validate the request body
 * @param request The NextRequest object
 * @param schema The Zod schema to validate against
 * @returns The validated request body
 * @throws ApiError if validation fails
 */
export async function validateRequestBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  try {
    const body = await request.json();
    return validateWithZod(body, schema);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      `Failed to parse request body: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.BAD_REQUEST,
      400,
      error instanceof Error ? error : undefined
    );
  }
}
