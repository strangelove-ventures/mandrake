#!/bin/bash
set -e

# Build and install the ripper executable

# Move to the ripper directory
cd "$(dirname "$0")"

# Build the TypeScript code
echo "Building TypeScript..."
npm run build

# Make the server executable
echo "Making server executable..."
chmod +x ./dist/server.js

# Create symlinks for global access
INSTALL_PATH="$HOME/.local/bin"
echo "Installing to $INSTALL_PATH..."

# Create directory if it doesn't exist
mkdir -p "$INSTALL_PATH"

# Create symlink
ln -sf "$(pwd)/dist/server.js" "$INSTALL_PATH/ripper-server"

echo "Installation complete! Please ensure $INSTALL_PATH is in your PATH."
echo "Current PATH: $PATH"

if [[ ":$PATH:" != *":$INSTALL_PATH:"* ]]; then
  echo "WARNING: $INSTALL_PATH is not in your PATH. Add it with:"
  echo "  export PATH=\"\$PATH:$INSTALL_PATH\""
fi

# Test if installation worked
if command -v ripper-server &> /dev/null; then
  echo "Success! ripper-server is now available in your PATH."
else
  echo "ripper-server not found in PATH. Please add $INSTALL_PATH to your PATH."
fi
