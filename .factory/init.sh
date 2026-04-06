#!/bin/bash
set -e

cd /Users/primmer/trip_tracker

# Upgrade @vis.gl/react-google-maps to v1.8.2+ for Map3D support
CURRENT_VERSION=$(node -e "const pkg = require('./node_modules/@vis.gl/react-google-maps/package.json'); console.log(pkg.version)" 2>/dev/null || echo "0.0.0")
MAJOR=$(echo "$CURRENT_VERSION" | cut -d. -f1)
MINOR=$(echo "$CURRENT_VERSION" | cut -d. -f2)

if [ "$MAJOR" -lt 1 ] || ([ "$MAJOR" -eq 1 ] && [ "$MINOR" -lt 8 ]); then
  echo "Upgrading @vis.gl/react-google-maps from $CURRENT_VERSION to ^1.8.2..."
  npm install @vis.gl/react-google-maps@^1.8.2
else
  echo "@vis.gl/react-google-maps is already at $CURRENT_VERSION (>=1.8.0), skipping upgrade."
fi

# Ensure dependencies are installed
npm install --prefer-offline --no-audit 2>/dev/null || true
