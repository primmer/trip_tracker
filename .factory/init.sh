#!/bin/bash
set -e

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
  npm install
fi

# Install Cloud Functions dependencies
if [ ! -d "functions/node_modules" ] && [ -d "functions" ]; then
  cd functions && npm install && cd ..
fi

# Create .env from template if it doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  echo "Created .env from .env.example -- fill in your secrets"
fi
