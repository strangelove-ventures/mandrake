import { createWorkspacesRoutes } from '@/lib/api/factories/createWorkspacesRoutes';

/**
 * @api {get} /api/workspaces Get all workspaces
 * @apiName GetWorkspaces
 * @apiGroup Workspaces
 * @apiSuccess {Object[]} workspaces List of workspaces
 */

/**
 * @api {post} /api/workspaces Create a new workspace
 * @apiName CreateWorkspace
 * @apiGroup Workspaces
 * @apiParam {String} name Workspace name
 * @apiParam {String} [description] Workspace description
 * @apiParam {String} [path] Custom path for workspace
 * @apiSuccess {Object} workspace Created workspace details
 */

export