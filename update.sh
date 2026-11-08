#!/bin/bash
echo "Initiating challenge list framework codebase synchronization..."
git fetch origin main
git checkout origin/main -- data index.html
echo "Site files updated successfully from GitHub repository."