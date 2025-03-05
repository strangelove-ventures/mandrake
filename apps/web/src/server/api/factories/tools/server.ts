import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest, 
  getMandrakeManagerForRequest 
} from '@/server/services/helpers';
import { z } from 'zod';
import { serverConfigSchema } from '@mandrake/workspace/src/types/workspace/tools';

type ServerParams = {
  params: { id?: string; setId: string; serverId?: string };
  workspaceScoped: boolean;
};

// Schema for adding a server
const addServerSchema = z.object({
  id: z.string().min(1),
  config: serverConfigSchema
});

/**
 * Get server config
 */
export async function getServerConfig(
  req: NextRequest,
  { params, workspaceScoped }: ServerParams
) {
  try {
    let toolsManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      const workspace = await getWorkspaceManagerForRequest(params.id);
      toolsManager = workspace.tools;
    } else {
      const mandrake = await getMandrakeManagerForRequest();
      toolsManager = mandrake.tools;
    }
    
    if (!params.serverId) {
      throw new ApiError(
        'Server ID is required',
        ErrorCode.BAD_REQUEST,
        400
      );
    }
    
    try {
      // Get server config
      const serverConfig = await toolsManager.getServerConfig(params.setId, params.serverId);
      return createApiResponse(serverConfig);
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('Config set not found')) {
          throw new ApiError(
            `Config set not found: ${params.setId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        if (error.message.includes('Server') && error.message.includes('not found')) {
          throw new ApiError(
            `Server not found: ${params.serverId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
      }
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to get server config: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}

/**
 * Add server config
 */
export async function addServerConfig(
  req: NextRequest,
  { params, workspaceScoped }: ServerParams
) {
  try {
    let toolsManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      const workspace = await getWorkspaceManagerForRequest(params.id);
      toolsManager = workspace.tools;
    } else {
      const mandrake = await getMandrakeManagerForRequest();
      toolsManager = mandrake.tools;
    }
    
    // Parse and validate request body
    const body = await req.json();
    let validatedData;
    
    try {
      validatedData = addServerSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ApiError(
          `Invalid request data: ${error.errors.map(e => e.message).join(', ')}`,
          ErrorCode.BAD_REQUEST,
          400,
          error
        );
      }
      throw error;
    }
    
    const { id, config } = validatedData;
    
    try {
      // Add server to config set
      await toolsManager.addServerConfig(params.setId, id, config);
      
      // Get the updated server config
      const serverConfig = await toolsManager.getServerConfig(params.setId, id);
      return createApiResponse({ id, config: serverConfig }, 201);
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('Config set not found')) {
          throw new ApiError(
            `Config set not found: ${params.setId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        if (error.message.includes('already exists')) {
          throw new ApiError(
            `Server already exists: ${id}`,
            ErrorCode.RESOURCE_CONFLICT,
            409,
            error
          );
        }
      }
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to add server config: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}

/**
 * Update server config
 */
export async function updateServerConfig(
  req: NextRequest,
  { params, workspaceScoped }: ServerParams
) {
  try {
    let toolsManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      const workspace = await getWorkspaceManagerForRequest(params.id);
      toolsManager = workspace.tools;
    } else {
      const mandrake = await getMandrakeManagerForRequest();
      toolsManager = mandrake.tools;
    }
    
    if (!params.serverId) {
      throw new ApiError(
        'Server ID is required',
        ErrorCode.BAD_REQUEST,
        400
      );
    }
    
    // Parse and validate request body
    const body = await req.json();
    let updates;
    
    try {
      // Use partial schema for updates
      updates = serverConfigSchema.partial().parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ApiError(
          `Invalid request data: ${error.errors.map(e => e.message).join(', ')}`,
          ErrorCode.BAD_REQUEST,
          400,
          error
        );
      }
      throw error;
    }
    
    try {
      // Update server config
      await toolsManager.updateServerConfig(params.setId, params.serverId, updates);
      
      // Get the updated server config
      const serverConfig = await toolsManager.getServerConfig(params.setId, params.serverId);
      return createApiResponse(serverConfig);
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('Config set not found')) {
          throw new ApiError(
            `Config set not found: ${params.setId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        if (error.message.includes('Server') && error.message.includes('not found')) {
          throw new ApiError(
            `Server not found: ${params.serverId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
      }
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to update server config: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}

/**
 * Remove server config
 */
export async function removeServerConfig(
  req: NextRequest,
  { params, workspaceScoped }: ServerParams
) {
  try {
    let toolsManager;
    
    if (workspaceScoped) {
      if (!params?.id) {
        throw new ApiError(
          'Workspace ID is required',
          ErrorCode.BAD_REQUEST,
          400
        );
      }
      const workspace = await getWorkspaceManagerForRequest(params.id);
      toolsManager = workspace.tools;
    } else {
      const mandrake = await getMandrakeManagerForRequest();
      toolsManager = mandrake.tools;
    }
    
    if (!params.serverId) {
      throw new ApiError(
        'Server ID is required',
        ErrorCode.BAD_REQUEST,
        400
      );
    }
    
    try {
      // Remove server config
      await toolsManager.removeServerConfig(params.setId, params.serverId);
      
      // Return success with 204 No Content status
      return new Response(null, { status: 204 });
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('Config set not found')) {
          throw new ApiError(
            `Config set not found: ${params.setId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        if (error.message.includes('Server') && error.message.includes('not found')) {
          throw new ApiError(
            `Server not found: ${params.serverId}`,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
      }
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to remove server config: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
