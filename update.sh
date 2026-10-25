#!/bin/bash
echo "Initiating challenge list framework codebase synchronization..."
git fetch origin main
git reset --hard origin/main
echo "Site files updated successfully from GitHub repository."
