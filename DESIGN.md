# Mandrake Design Session

You are a solutions architect helping design Mandrake, an AI assistant/agent platform. We have a final architecture defined below but we also have some work in an older repo that we will be referencing.

old_mandrake: /Users/johnzampolin/go/src/github.com/strangelove-ventures/mandrake
new_mandrake: /Users/johnzampolin/go/src/github.com/strangelove-ventures/mandrake-new

Our output from this work will be a set of implementation plans for each of the components put into the new repo at the correct locations.

Our new repository will use [Bun](https://bun.sh/docs) for package management and [Next JS](https://nextjs.org/) for the frontend.

## Terminology Mapping

- Workspace: Project-level configuration and context (similar to claude projects)
- Session: Individual chat interactions within a workspace (similar to a conversation or chat in other tools)
- Tool: External capability or integration (in mandrake we use modelcontextprotocol for this)

## Project Architecture

Mandrake is made up of a number of components/concepts/pices. Here is a list of them:

### `~/.mandrake`

The `~/.mandrake` folder holds all the data required for the Mandrake application. Users should be able to back up this folder and run Mandrake in a new environemnt and have the same experience as long as they've ported over their `~/.mandrake`:

```shell
~/.mandrake
├── mandrake.db
├── mandrake.json
├── tools.json
├── models.json
├── prompt.json
└── workspaces
```

- `mandrake.db` is a sqlite database which holds information about sessions users have outside of the individual workspaces. While the core abstraction in Mandrake is the workspace and that is where most of the sessions will take place we want to have a database to facilitate sessions that might work over multiple databases. We plan to build this feature out last but we should keep in mind we will need it at the outset. These sessions should enable the user a chat interface to add features to sessions and/or manage cross session stuff.
- `mandrake.json` is a config file for the application itself
- `tools.json` is a config file for the mcp servers which should be available to the top level mandrake instance.
- `workspaces` holds the data for the workspaces themselves
- `models.json` is a config file for the llm to serve the sessions
- `prompt.json` is a config file for the system prompt. see below

> NOTE: We plan to use [Knex](https://knexjs.org/) to manage the sqlite dbs throughout the project

### Workspace Manager

The `WorkspaceManager` is piece of server side code which manages the interactions with a `Workspace` on disk. It should live in `{new_mandrake}/packages/workspace` A `Workspace` has a file structure as follows:

```shell
~/.mandrake/workspaces
└── {name}
    ├── config
    │   ├── dynamic.json
    │   ├── models.json
    │   ├── prompt.json
    │   └── tools.json
    ├── files
    │   └── foo.md
    ├── session.db
    ├── src
    ├── mcpdata
    │   └── {mcp_volume}
    └── workspace.json
```

- `config` this folder contains various configuration files. These should all have associated UI to manage the contents as well as sane defaults when creating a new workspace.
  - `dynamic.json` these are pieces of dynamic context. Essentially they are tool calls that will be updated on every usage of the data. For example you can you setup `tree . --gitignore` from the root of the `src/` folder where your code is stored so the LLM has current view of project structure at all times or `curl myapi.com/route` to provide live data from integrations into the session enabling much more capable interactions. This is a core feature of Mandrake. This relies on the tools in `tools.json` and isn't initially populated with anything. See `{old_mandrake}/packages/types/src/workspace/types.ts` for current definition `DynamicContextMethodConfig`. We should add the ability have pieces of dynamic context defined that are disabled (i.e. not included in calls.)
  - `models.json` the models configured to work with a given workspace. One of the models is enabled, others are just configured. we should default to having the ollama local API enabled then allow user to add more models in the UI. We will be using the [Cline](https://github.com/cline/cline) model provider implemetnation that also contains token tracking to enable context window visualization. We will need to do some work to define the structure of this file after preparing a plan to integrate their implementation into our code,
  - `prompt.json` this is information from the workspace that will be used to populate the system prompt. Similar to the prompt in claude projects, but in the future could grow into the ability to place different templated variables. This file is `{"prompt": ""}`. We may add other props here like `personality` etc... in the future.
  - `tools.json` the definitions for the mcp servers to be run. We will be using `docker` to run and manage the lifecycle of the mcp servers. See `{old_mandrake}/packages/types/src/mcp/config.ts` for the current structure of the tool configurations. We plan to have a `filesystem`, `git` and `fetch` tool enabled by default for each workspace.
- `files` these are user defined files that will be included in context. there will be UI to enabled create/delete.
- `session.db` a sqlite db with all the data for the sessions that happen w/in a given workspace. See the schema.prisma for the shape of the session data. Note that we've added more structure than most other frameworks with `Rounds` which are made up of `Requests` (user requests to the system) and `Responses` (LLM responses) which may have multiple `Turns` (where tool calls get processed continuing the response from the llm). We plan to manage this with Knex
- `src` a space for source code to go. One of the major use cases for Mandrake is to allow developers to build more capable platforms for working on their code. We are reserving the src directory to store that code. We will anticipate that it is a git repository and can be managed using the default git mcp server. Add ability to simlink to existing repo structure.
- `mcpdata` some mcp servers need space on disk for storage. Because we are using docker, if a container needs storage it will use space here.
- `workspace.json` holds the name and description of the workspace along with any other top level configuration details/info.

The `WorkspaceManager` type should have:

- `DynamicContextManger`: responsible for managing the dynamic context file. exposes create/update/delete for individual pieces of dynamic context.
- `PromptManager`: responsible for managing the prompt file. exposes create/update/delete for the prompt/pieces of the prompt.
- `ModelManager`: responsible for managing the models file. exposes create/update/delete for the models config.
- `ToolsManager`: responsible for managing the tools file. exposes create/update/delete for the tools config.
- `FilesManager`: responsible for managing the files. Should be able to add/delete/rename/update files. Should watch for new files added to this folder. See the current file watcher.
- Methods to manage `workspace.json`.
- `SessionManager`: this is basically the `{old_mandrake}/packages/storage`. It should expose ability to query each part of the session individually as well as to pull all session data in a few formats. It should also have the ability to stream updates to the frontend. This may require some work with the Knex framework we are using. This is still underspecified and will require a design session.
- `BackupManager`: this is currently a tbd concept but we should leave stubs in the code here. Users should be able to back up their workspaces to cloud storage for sharing with other users/devices. My initial thought was to use `tar` to package and then have some configured backends. This will be a longer term cirticial feature that will not be initially implemented.

### MCP Server Manager

The MCP server manager uses docker to spin up and run the MCP servers. It should live in `{new_mandrake}/packages/mcp`. MCP servers by default communicate over stdin/stdout so we've had to build in a system where we hijack those channels in docker to perform the JSONRPC 2.0 calls. We have a current implementation that is still WIP but instructive over in the `{old_mandrake}/packages/mcp` folder. We will use that as a reference to design the new system. It currently isn't very performant for spin up/down and also has some stability cleanup issues. The new implementation should consist of the following structures:

- `DockerMCPService`: the highest level abstraction. Provides the interface for the application. Each workspace should have one of these and they should be able to run concurrently w/ the same servers. More concretely: if 2 workspaces have the same servers enabled they shouldn't conflict in any way. This object should use the best practices (or a great library) for creation and maintainece of docker based services. The api it should provide to the application will at minimum provide:
  - `startAll([]server)` - start all servers in an array of server configs. used when starting up the application or beginning work on a workspace.
  - `start(server)` - start an individual server. used when adding a server to the workspace
  - `logs(server)` - shows the logs for a given server. used when debugging or adding new servers
  - `restart(server)` - allow user to restart server by blowing away old container and starting a new one
  - `statusAll` - shows the current status of all servers. (i.e. running/stopped/stalled/starting/etc...)
  - `status(server)` - shows the status for a single server
  - `callTool(server, toolName, params)` - call a tool on a given server with some parameters. This is the core method
  - `listTools(server)` - Calls `listTools` for a single server. Used when doing tool execution or during dynamic config
  - `listAllTools()` - Lists all tools for all servers. Used when supplying tools to the llm.
- `DockerMCPServer`: represents the individual docker container. Should track its own status and have methods supporting the above methods. We have an existing implementation in `{old_mandrake}/packages/mcp/src/docker/server.ts` that will need to be fleshed out and hardened. We would like very low latency spin up/down.
- `DockerMCPTransport`: implements the `Transport` interface from `@modelcontextprotocol/sdk/shared/transport.js` to enable usage of that SDK to talk to and manage the mcp interactions. The current implementation at `{old_mandrake}/packages/mcp/src/docker/transport.ts` has some pieces on how to manage the JSON RPC data but isn't working with the right file apis for Bun so will need to be updated. Also we previously had issues with cleanup/spinup here that was preventing container creation/deletion in a timely manner.

The current implementaion should be used as a guide but we should build a more robust implementation with testing for:

- spin up/down latency
- tool use for servers
- all functionality in the DockerMCPService api

### Provider Manager

The [`Cline`](https://github.com/cline/cline) project has a nice provider implementation that we should be able to import and use to create our own `ProviderManager`. We will have a wrapper w/ integration testing and other pieces to live in `{new_mandrake}/packages/provider`. Cline's implementation includes tool calling, streaming and token counting/costing. We will need to work to define what we would like our interface to look like and we should TDD development of this package. This package will require a design session and some things to think about:

- Do we want to make this package depend on the `workspace` (for model config) and `mcp` (for tools) packages? Seems like it will need to for the types for sure, however do we want to require the session database and integrate that into the calls (seems like we will) and do we want to ensure that the user has a live `DockerMCPService` (seems like we will).
- These tests will all be full integration tests. We don't want to mock, we want tests that exercise the full functionality of the system. We will likely implement the WorkspaceManager and DockerMCPServer first (TDDing both of those) then combine them in the provider class.
- I think we will want a `Provider` and a `ProviderManager` where we have ability to switch between a few different providers. This functionality may want to live in either the provider package or the session manager.

### Session Manager

The `SessionManager` is the last piece of backend infrastructure that combines `WorkspaceManager`, `DockerMCPService` and `ProviderManager`. I think it deserves to be its own class seperate from the provider manager. Ideally the `ProviderManager` takes the outputs from the `WorkspaceManager` and `DockerMCPService` runs its calls where as the `SessionManager` maintains all three of them to provide all the info necessary for the API.

The `SessionManager` will live in the `{new_mandrake}/packages/session` package and should have similar testing to the `ProviderManager`.

### Utils

There will be a `{new_mandrake}/packages/utils` for the logger (see the existing logging implementation in `{old_mandrake}/packages/types/src/logger`) and other shared functionality.

### Frontend

There will be a frontend for Mandrake that is a Next js application which exposes key functionality

#### API

We will need to support the data/functionality from `WorkspaceManager`, `DockerMCPService` and `ProviderManager` via our api to the frontend. Below is a list I've made of the routes that will be necessary. This may be incomplete or need additional work. We should flesh this out into an implementation plan in `{new_mandrake}/apps/web/src/app/api`

```shell
/config                                  - list/update current config from `~/.mandrake/mandrake.json` 
/models                                  - model configuration
/prompt                                  - prompt configuration
/tools                                   - list/manage top level tools
/tools/[serverName]/methods              - list methods from a tool
/tools/[serverName]/methods/[methodName] - call a tool
/sessions                                - list mandrake sessions
/sessions/[id]                           - a single session endpoint
/workspaces                              - list all workspaces with enough data to display them
/workspaces/[id]                         - the information necessary to display a given workspace
/workspaces/[id]/dynamic                 - dynamic context management
/workspaces/[id]/models                  - model configuration        
/workspaces/[id]/prompt                  - prompt configuration
/workspaces/[id]/tools                   - tool configuration
/workspaces/[id]/tools/[serverName]/methods - tool methods list
/workspaces/[id]/tools/[serverName]/methods/[methodName] - tool calling
/workspaces/[id]/files                   - file management
/workspaces/[id]/files/[fileName]        - individual file creation/viewing
/workspaces/[id]/sessions                - list sessions for a workspace
/workspaces/[id]/sessions/[sessionId]    - individual session w/in a workspace
```

#### Stores

The frontend will use [zustand](https://github.com/pmndrs/zustand) for its store implementation. We will need the following stores to consume the apis mentioned above. We will keep the new store implementations in `{new_mandrake}/apps/web/src/lib/stores/`

- `MandrakeStore` - for the `/` page that has top level config, list of workspaces, default models, default prompt etc... This store should support operations on all of those pieces of data
- `MandrakeSessionStore` -  for the `/sessions/[id]` page to enable session on mandrake and workspace config. will need configuration for the different workspaces as well as top level configuration in the scope. Note that all tool calls and data are on the server so we will need to pass it through the API into the store.
- `WorkspaceStore` - To support functionality on the `/workspaces/[id]` page.
- `WorkspaceSessionStore` - To support functionality on the `/workspaces/[id]/session/[sessionId]` page.

We should build an implementation plan for each one as we come to the functionality.

> Note: there are existing stores implemented at `{old_mandrake}/apps/web/src/lib/stores/` that don't really contain a ton of useful stuff but are there to look at if you would like to reference them

#### Pages or Key Components

The application should have the following pages available to the user. Each page description below will contain the desired functionality:

- `/page.tsx`
  - list the workspaces configured on the server and allow user to click into them
  - exposes components to manage top level mandrake configuration (mcp servers, config, models)
  - It should also allow the user to start new "mandrake session" to chat with mandrake about the installation
- `/sessions/[id]/page.tsx` or `MandrakeSession.tsx`
  - this page (or component) will allow the user to start a chat session with information about the Mandrake installation in context
  - these chats should enable user to modify workspaces or other pieces of the mandrake installation.
- `/workspaces/[id]`
  - exposes components to manage workspace level configuration (mcp servers, dynamic context, files, models, prompt, github repo)
  - this page exposes list of workspace sessions
  - this page allows for creation of new workspace session
  - this page exposes list of workspace tasks
- `/workspaces/[id]/sessions/[sessionId]`
  - exposes components to manage workspace level configuration expression in this sessions. users should be able to toggle enabled on tools, context config files, etc... and also add remove them here. we should minimize this functionality so if users don't want it its not there.
  - exposes the context usage data
  - exposes the api token usage and cost data
  - exposes all data for the session and allows the user to carry on a conversation.

#### Components

- `MCPConfigurator`

  - Lists existing MCP servers and their status
  - Button to view MCP logs from an individual server
  - Button to restart an individual server
  - Button to add new servers
  - Add new servers goes to list of preconfigured servers, also option to fill in the server config from scratch
  - Button to remove servers
  - Idealy this works with both the Mandrake tools as well as the workspace tools (i.e. it takes the tools as props?)

- `DynamicContentConfigurator`

  - Allows users to configure dynamic contexts for a workspace
  - May share some components with the MCP configurator
  - Button to add dynamic content
  - takes you to a list of mcp servers
  - Click into a server to view its methods and their descriptions
  - Can click into method, exposes a form to call method and see results, button to add dynamic context

- `ModelConfigurator`

  - Allows users to configure models for MandrakeSession or WorkspaceSession
  - Allows users to select current model.
  - Allows users to configure new models from a list of options.

- `ContextFileConfigurator`

  - Allows users to upload new files
  - Allows users to create files from a form
  - Allows users to view files
  - Allows users to delete files

- `SystemPromptConfigurator`

  - Allows user to edit workspace system prompt addition

- `WorkspaceCard`

  - A list of all the workspaces available locally
  - should include Name, Description, Created and Updated

- `WorkspaceList`

  - Display all the workspace cards

- `SessionTable`

  - A table for displaying a list of sessions.
  - Should work for both MandrakeSessions and WorkspaceSessions
  - Should allow for users to rename sessions, tag sessions and have sort arrows

- `MandrakeSession`

  - A session that uses the `MandrakeSessionStore`.
  - this session data is stored in the `~/.mandrake/mandrake.db`
  - This session consists of a user input. This user input field should allow for large amounts of text to be entered easily and should offer user a nice way to type into it, not just a single line

- `WorkspaceSession`

  - A session that uses the `WorkspaceSessionStore`
  - This session data is stored in the `~/.mandrake/workspace/{name}/session.db`
  - This session consists of a user input. This user input field should allow for large amounts of text to be entered easily and should offer user a nice way to type into it, not just a single line

- `SessionView`

  - The part of the session to visualize the session data from the session db.
  - To be shared between the `MandrakeSession` and `WorkspaceSession`

- `SessionRoundView`

  - Made up of a `SessionRequestView` and a `SessionResponseView`

- `SessionRequestView`

  - A component for viewing a user request for a session

- `SessionResponseView`

  - A component for viewing a reponse in a session.
  - A `Reponse` is made up of `Turns` and each turn may include text or `ToolCall` parts.

- `ResponseTextView`

  - A component for visualizing the text component of a repsonse
  - Should support markdown and mermaid drawings and other common forms of illuminated text

- `ResponseToolCallView`

  - This represents a tool call visually w/in the session flow
  - We should have the data the llm uses to call the tool and the response data in full available to view
  - Should show 1. server 2. method name 3. button to view modal with call data and response data, both scrollable if needed and properly highlighted and formmated json
  
- ``

## Implementation Plan

- We plan to implement this project in a test driven development fashion to ensure each package is working and well tested before moving up the stack
- Take the above `Project Architecture` section and create individual `IMPLEMENTATION_PLAN.md` in each of the following areas:

  - [ ] `/` - We should have a top level implementation plan that describes repo structure, build system, testing, etc... this should describe the set of commands to create the application in some detail.
  - [ ] `packages/utils` - We should implement this first with a `logger` for use in the rest of the application
  - [ ] `packages/workspace` - We should implement the `WorkspaceManager` and necessary pieces here.
  - [ ] `packages/mcp` - We should implement the MCP Server Manager here
  - [ ] `packages/provider` - We should implement the provider package using Cline here
  - [ ] `packages/session` - We should implement the session manager here
  - [ ] `apps/web/` - We should have an implementation for the full webapp. we should prefer to use command line tooling to generate files (i.e. nextjs and shadcn)
  - [ ] `apps/web/src/app/api` - We should have a plan to implement the API routes here
  - [ ] `apps/web/src/lib/stores` - We should have a plan to implement the stores that consume the apis here
  - [ ] `apps/web/src/components/` - We should have a plan to implement the components here
  - [ ] `apps/web/src/` - We should have a plan to implement pages here

- These implementation plans should:,

  - Consider deeply the interface the package offers (i.e. how does user instantiate in the code and what are inputs/outputs)
  - Design interface first. `IMPLEMENTATION_PLAN.md` should have definitions for the key exposed interfaces
  - Then after we have an interface agreed we should build out testing
  - Testing plan should be a list of functionality that needs testing and some psudeo code for the tests
  - `IMPLEMENTATION_PLAN.md` should have a proposed file structure with some information on what is the responsiblity of each file

## Code Analysis Guidelines

- Use read_multiple_files to examine relevant source code. Be sure to use old_mandrake and new_mandrake path to translate relative paths into absolute ones.
- Reference specific implementation patterns
- Focus on clean interface definitions
- Check documentation (brave_search, fetch), best practices and tests for usage patterns
- Use concrete examples from codebases when proposing solutions
