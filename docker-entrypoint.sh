#!/bin/bash
set -e

# Configure git identity from environment variables
if [ -n "$GIT_USER_NAME" ]; then
    git config --global user.name "$GIT_USER_NAME"
fi

if [ -n "$GIT_USER_EMAIL" ]; then
    git config --global user.email "$GIT_USER_EMAIL"
fi

# Configure SSH for git (if mounted)
if [ -d "/home/dev/.ssh" ]; then
    # Try to set permissions (may fail if mounted read-only)
    chmod 700 /home/dev/.ssh 2>/dev/null || true
    chmod 600 /home/dev/.ssh/* 2>/dev/null || true
    # Start ssh-agent and add keys
    eval "$(ssh-agent -s)"
    ssh-add /home/dev/.ssh/id_* 2>/dev/null || true
fi

# Display helpful message
echo "========================================="
echo "  Claude Code Development Environment"
echo "========================================="
echo ""
echo "Git configured as: ${GIT_USER_NAME:-<not set>} <${GIT_USER_EMAIL:-not set}>"
echo ""
echo "To authenticate Claude Code, run:"
echo "  claude login"
echo ""
echo "Your authentication will be saved in ~/.claude"
echo "and will persist across container restarts."
echo ""
echo "========================================="

# Execute the command (default: bash)
exec "$@"
