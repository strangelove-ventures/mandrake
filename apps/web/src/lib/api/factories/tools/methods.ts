import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest, 
  getMandrakeManagerForRequest,
  getMCPManagerForRequest
} from '@/lib/services/helpers';
import { z } from 'zod';

type MethodsParams = {
  params: { 
    id?: string; 
    serverName: string;
    methodName?: string;
  };
  workspaceScoped: boolean;
};

/**
 * List available methods for a server
 */
export async function listServerMethods(
  req: NextRequest,
  { params, workspaceScoped }: MethodsParams
) {
  try {
    let mcpManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      mcpManager = await getMCPManagerForRequest(params.id);
    } else {
      mcpManager = await getMCPManagerForRequest();
    }
    
    // Get the server instance
    const server = mcpManager.getServer(params.serverName);
    
    if (!server) {
      throw new ApiError(
        `Server not running: ${params.serverName}`,
        ErrorCode.RESOURCE_NOT_FOUND,
        404
      );
    }
    
    try {
      const tools = await server.listTools();
      return createApiResponse(tools);
    } catch (error) {
      throw new ApiError(
        `Failed to list server methods: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to list server methods: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}

/**
 * Execute a server method
 */
export async function executeServerMethod(
  req: NextRequest,
  { params, workspaceScoped }: MethodsParams
) {
  try {
    let mcpManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      mcpManager = await getMCPManagerForRequest(params.id);
    } else {
      mcpManager = await getMCPManagerForRequest();
    }
    
    if (!params.methodName) {
      throw new ApiError(
        'Method name is required',
        ErrorCode.BAD_REQUEST,
        400
      );
    }
    
    // Parse request body for method arguments
    const body = await req.json();
    
    try {
      // Invoke the method
      const result = await mcpManager.invokeTool(
        params.serverName,
        params.methodName,
        body
      );
      
      return createApiResponse(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Server') && error.message.includes('not found')) {
          throw new ApiError(
            `Server not running: ${params.serverName}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        
        // Some servers might throw specific errors that should be passed through
        // with their original message but with appropriate HTTP status
        throw new ApiError(
          error.message,
          ErrorCode.BAD_REQUEST,
          400,
          error
        );
      }
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to execute method: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
