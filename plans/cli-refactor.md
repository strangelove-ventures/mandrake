# Mandrake CLI Transformation Plan

## Project Overview

Transform Mandrake from a web-based AI agent platform to a CLI-first tool focused on secure operations (DevOps, crypto transactions) with deep git integration and enhanced tool capabilities.

## Phase 1: Repository Cleanup (Days 1-2)

### 1.1 Components to Remove

- [x] `/packages/api/` - Complete removal
- [x] `/web/` - Complete removal  
- [x] `/SYSTEM_PROMPT_API.md` - Remove API-specific prompt
- [x] API-related scripts in root `package.json`
- [x] Web-related dependencies from all `package.json` files

### 1.2 Configuration Updates

- [x] Update root `package.json` workspaces array
- [x] Remove build scripts: `build:api`, `build:web`, `dev:api`, `dev:web`, etc.
- [x] Update test scripts to remove api/web tests
- [x] Clean up unused dependencies (Next.js, React, Hono, etc.)

### 1.3 Documentation Before Removal

- [ ] Create `REMOVED_FEATURES.md` documenting:
  - What was removed
  - Why it was removed
  - Key learnings from the web/API implementation
- [ ] Git tag current state: `git tag pre-cli-transformation`
- [ ] Create a branch for the old version: `git branch legacy-web-version`

## Phase 2: Documentation Audit (Days 3-5)

### 2.1 Files Requiring Updates

#### Root Level

- [ ] `/README.md`
  - Remove web interface references
  - Update architecture diagram
  - Add CLI installation/usage instructions
  - Update feature list

- [ ] `/DESIGN.md`
  - Remove web application section
  - Update component relationships
  - Focus on CLI architecture
  - Update data flow diagrams

#### Package Level

- [ ] `/packages/workspace/README.md` - Remove API integration references
- [ ] `/packages/session/README.md` - Update examples for CLI usage
- [ ] `/packages/mcp/README.md` - Review for accuracy
- [ ] `/packages/provider/README.md` - Flag for major refactor
- [ ] `/packages/ripper/README.md` - Consider native integration approach
- [ ] `/packages/utils/README.md` - Update with new provider approach

#### Other Documentation

- [ ] Remove or update all `CLAUDE.md` files
- [ ] Archive old implementation plans in `/docs/archive/`
- [ ] Create new `/docs/cli/` directory for CLI-specific docs

### 2.2 New Documentation to Create

- [ ] `/CLI_ARCHITECTURE.md` - New architecture focused on CLI
- [ ] `/docs/cli/QUICK_START.md` - Getting started with CLI
- [ ] `/docs/cli/COMMANDS.md` - CLI command reference

## Phase 3: Feature Planning & Scoping

### Major Features Priority Order

#### 1. Provider System Refactor (Priority 1 - Enables Everything)

**Estimated Effort**: 1-2 weeks

**Key Changes**:

- Plugin-style architecture
- Unified streaming interface
- Centralized context window management
- Simplified configuration
- Better error handling and retry logic

**Research Tasks**:

- [ ] Analyze Cline's provider implementation
- [ ] Document current pain points in detail
- [ ] Design new provider interface

#### 2. Git Integration & Version Control (Priority 2 - Core Security)

**Estimated Effort**: 2-3 weeks

**Key Features**:

- Automatic branch creation (naming schema: `mandrake/<workspace>/<timestamp>-<task-summary>`)
- Intelligent commit messages
- Checkpoint system using git tags
- Rollback capabilities
- Future: GitHub PR automation

**Research Tasks**:

- [ ] Study how Aider handles git operations
- [ ] Design branch naming conventions
- [ ] Plan checkpoint tag schema

#### 3. CLI/TUI Implementation (Priority 3 - User Interface)

**Estimated Effort**: 3-4 weeks

**Approaches to Evaluate**:

- Codex: Full TUI with panels, real-time updates
- Continue: Hybrid approach with rich formatting
- Aider: Simple REPL with powerful commands

**Research Tasks**:

- [ ] Create comparison matrix of CLI approaches
- [ ] Prototype basic TUI with Ink or similar
- [ ] Design command structure

#### 4. Tool System Enhancement (Priority 4 - Functionality)

**Estimated Effort**: 2-3 weeks

**Native Tools to Implement**:

- Filesystem operations (replace ripper)
- Git operations
- GitHub integration
- Command execution
- Custom tool framework

**Research Tasks**:

- [ ] Evaluate MCP vs native implementation tradeoffs
- [ ] Design tool plugin system
- [ ] Plan security boundaries

#### 5. Security & Isolation (Priority 5 - Production Ready)

**Estimated Effort**: 2 weeks

**Key Features**:

- `.ws` folder isolation from LLM access
- Secrets management
- Command approval workflows
- Audit logging via git
- Sandboxing for command execution

**Research Tasks**:

- [ ] Study Codex's sandboxing approach
- [ ] Design secrets isolation strategy
- [ ] Plan approval workflow UX

## Phase 4: Implementation Roadmap

### Sprint 1-2: Foundation (Weeks 1-2)

- Repository cleanup
- Documentation audit
- Provider system design
- Basic CLI scaffold

### Sprint 3-4: Core Systems (Weeks 3-4)

- Provider system implementation
- Basic git integration
- Initial CLI interface

### Sprint 5-7: Feature Development (Weeks 5-7)

- Complete git integration
- Full CLI/TUI implementation
- Native tool development

### Sprint 8-9: Polish & Security (Weeks 8-9)

- Security implementation
- Testing and refinement
- Documentation completion

## Feature Planning Document Template

For each major feature, create a document following this structure:

```markdown
# Feature: [Name]

## Overview
Brief description of the feature and its purpose

## Requirements
### Functional Requirements
- FR1: ...
- FR2: ...

### Non-Functional Requirements
- Performance targets
- Security requirements
- Usability goals

## Technical Design
### Architecture
- Components involved
- Data flow diagrams
- Dependencies

### Implementation Approach
- Key technical decisions
- Technology choices
- Integration points

## User Stories
- As a user, I want to...
- As a developer, I want to...

## Risks & Mitigations
- Technical risks
- Security concerns
- Performance implications

## Success Metrics
- How we measure success
- Expected outcomes

## Implementation Phases
- Phase 1: MVP
- Phase 2: Enhancement
- Phase 3: Polish

## Open Questions
- Unresolved design decisions
- Areas needing research
```

## Success Criteria

### Phase 1 Success

- [ ] All web/API code removed
- [ ] Tests pass without web/API dependencies
- [ ] Repository builds successfully

### Phase 2 Success

- [ ] All documentation updated
- [ ] No references to removed features
- [ ] Clear CLI-focused documentation

### Phase 3 Success

- [ ] All features have planning documents
- [ ] Clear implementation roadmap
- [ ] Research tasks completed

### Overall Project Success

- [ ] Fully functional CLI tool
- [ ] Git integration working smoothly
- [ ] Secure handling of sensitive operations
- [ ] Easy to extend with new providers/tools
- [ ] Well-documented and tested

## Risk Register

1. **Complexity of Git Integration**
   - Risk: Git operations may conflict with user's workflow
   - Mitigation: Careful design of branch/commit strategies

2. **Provider Refactor Scope**
   - Risk: May break existing functionality
   - Mitigation: Comprehensive testing, gradual migration

3. **CLI UX Challenges**
   - Risk: Hard to make as intuitive as GUI
   - Mitigation: Study successful CLI tools, user testing

4. **Security Implementation**
   - Risk: Vulnerabilities in sensitive operations
   - Mitigation: Security audit, sandboxing, careful design

## Next Actions

1. **Immediate** (This Week):
   - [ ] Execute Phase 1 cleanup
   - [ ] Begin Phase 2 documentation audit
   - [ ] Set up project board for tracking

2. **Next Week**:
   - [ ] Complete documentation updates
   - [ ] Start provider system research
   - [ ] Create first feature planning doc

3. **Following Weeks**:
   - [ ] Begin implementation sprints
   - [ ] Regular progress reviews
   - [ ] Adjust plan based on findi
