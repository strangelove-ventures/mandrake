import { NextRequest } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { ApiError, ErrorCode } from './errorHandling';

/**
 * Validates request body against a Zod schema
 * @param req Next.js request
 * @param schema Zod schema for validation
 * @returns Validated request body
 * @throws ApiError if validation fails
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      throw new ApiError(
        `Validation error: ${formattedErrors}`,
        ErrorCode.VALIDATION_ERROR,
        400,
        error
      );
    }
    
    throw new ApiError(
      'Invalid request body',
      ErrorCode.BAD_REQUEST,
      400,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Validates URL params against a Zod schema
 * @param params Request params
 * @param schema Zod schema for validation
 * @returns Validated params
 * @throws ApiError if validation fails
 */
export function validateParams<T>(
  params: Record<string, string | string[]>,
  schema: ZodSchema<T>
): T {
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      throw new ApiError(
        `Invalid parameters: ${formattedErrors}`,
        ErrorCode.VALIDATION_ERROR,
        400,
        error
      );
    }
    
    throw new ApiError(
      'Invalid request parameters',
      ErrorCode.BAD_REQUEST,
      400,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Validates query parameters against a Zod schema
 * @param req Next.js request
 * @param schema Zod schema for validation
 * @returns Validated query parameters
 * @throws ApiError if validation fails
 */
export function validateQuery<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): T {
  try {
    const url = new URL(req.url);
    const queryParams: Record<string, string> = {};
    
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    return schema.parse(queryParams);
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      throw new ApiError(
        `Invalid query parameters: ${formattedErrors}`,
        ErrorCode.VALIDATION_ERROR,
        400,
        error
      );
    }
    
    throw new ApiError(
      'Invalid query parameters',
      ErrorCode.BAD_REQUEST,
      400,
      error instanceof Error ? error : undefined
    );
  }
}