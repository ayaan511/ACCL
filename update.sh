#!/bin/bash
# Pulls ONLY the data folder from GitHub. Every other file is left alone.
set -e

# Always run from the top of the repo, so "data" is the right folder
repoRoot="$(git rev-parse --show-toplevel)"
cd "$repoRoot"

echo "Syncing the data folder from GitHub..."

# Download the latest commits (this does not change any of your files)
git fetch origin main

# Replace ONLY the data folder with the version on GitHub
git checkout origin/main -- data

echo "Data folder updated from GitHub. Nothing else was changed."