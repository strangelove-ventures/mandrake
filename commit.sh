#!/bin/bash

# Add all changes
git add -A

# Commit with detailed message
git commit -m "feat: Remove web UI and API components for CLI transformation

- Removed entire web/ directory containing Next.js frontend
- Removed packages/api/ containing Hono API server  
- Removed SYSTEM_PROMPT_API.md (API-specific prompt)
- Updated root package.json to remove web/api scripts and workspaces
- Created REMOVED_FEATURES.md documenting the removal and learnings

This is Phase 1 of the CLI transformation project to convert Mandrake
from a web-based platform to a CLI-first tool focused on secure operations
with git integration."

# Push the branch
git push origin HEAD

echo "Changes committed and pushed!"
echo "Create PR at: https://github.com/strangelove-ventures/mandrake/compare/mandrake/cli-transformation/20250522-110133-cleanup"
