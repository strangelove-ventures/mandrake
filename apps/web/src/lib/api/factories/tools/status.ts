import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '../../middleware/errorHandling';
import { createApiResponse } from '../../utils/response';
import { 
  getWorkspaceManagerForRequest, 
  getMandrakeManagerForRequest,
  getMCPManagerForRequest
} from '@/lib/services/helpers';

type StatusParams = {
  params: { id?: string; serverName: string };
  workspaceScoped: boolean;
};

/**
 * Get the status of a server
 */
export async function getServerStatus(
  req: NextRequest,
  { params, workspaceScoped }: StatusParams
) {
  try {
    // We need both the tools manager to verify server exists in config
    // and the MCP manager to get the status
    let toolsManager, mcpManager;
    
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
      mcpManager = await getMCPManagerForRequest(params.id);
    } else {
      const mandrake = await getMandrakeManagerForRequest();
      toolsManager = mandrake.tools;
      mcpManager = await getMCPManagerForRequest();
    }
    
    // Verify the server exists in some config
    const activeSetId = await toolsManager.getActive();
    const configSets = await toolsManager.listConfigSets();
    let serverFound = false;
    
    // First check in active set
    try {
      const activeSet = await toolsManager.getConfigSet(activeSetId);
      if (activeSet[params.serverName]) {
        serverFound = true;
      }
    } catch (error) {
      // If active set doesn't exist or doesn't have the server, continue checking other sets
    }
    
    // If not found in active set, check other sets
    if (!serverFound) {
      for (const setId of configSets) {
        if (setId === activeSetId) continue; // Already checked
        
        try {
          const configSet = await toolsManager.getConfigSet(setId);
          if (configSet[params.serverName]) {
            serverFound = true;
            break;
          }
        } catch (error) {
          // Continue to next set if this one has issues
          continue;
        }
      }
    }
    
    if (!serverFound) {
      throw new ApiError(
        `Server not found: ${params.serverName}`,
        ErrorCode.RESOURCE_NOT_FOUND,
        404
      );
    }
    
    // Get server state from MCP manager
    const serverState = mcpManager.getServerState(params.serverName);
    
    if (!serverState) {
      // Server exists in config but not running
      return createApiResponse({
        name: params.serverName,
        status: 'disconnected',
        error: 'Server not running',
        logs: []
      });
    }
    
    // Return server state
    return createApiResponse({
      name: params.serverName,
      status: serverState.error ? 'error' : 'connected',
      error: serverState.error,
      logs: serverState.logs.slice(-100) // Return last 100 log entries for brevity
    });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw new ApiError(
        `Failed to get server status: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INTERNAL_ERROR,
        500,
        error instanceof Error ? error : undefined
      );
    }
    throw error;
  }
}
