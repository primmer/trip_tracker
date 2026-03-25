#!/bin/bash
# Trip Tracker Dev Server Launcher
# Usage: ./dev.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=== Trip Tracker Dev Server ==="
echo ""

# Check if Vite is running
if lsof -ti :5173 > /dev/null 2>&1; then
  echo -e "  Frontend (Vite):    ${GREEN}running${NC}  http://localhost:5173"
else
  echo -e "  Frontend (Vite):    ${YELLOW}starting...${NC}"
  cd "$(dirname "$0")" && npx vite --port 5173 &
  sleep 2
  if lsof -ti :5173 > /dev/null 2>&1; then
    echo -e "  Frontend (Vite):    ${GREEN}running${NC}  http://localhost:5173"
  else
    echo -e "  Frontend (Vite):    ${RED}FAILED${NC}"
  fi
fi

# Build and start backend
if lsof -ti :5001 > /dev/null 2>&1; then
  echo -e "  Backend (Functions): ${GREEN}running${NC}  http://localhost:5001"
else
  echo -e "  Backend (Functions): ${YELLOW}building & starting...${NC}"
  cd "$(dirname "$0")/functions" && npm run build 2>/dev/null && node lib/dev-server.js &
  sleep 3
  if curl -sf http://localhost:5001/api/health > /dev/null 2>&1; then
    echo -e "  Backend (Functions): ${GREEN}running${NC}  http://localhost:5001"
  else
    echo -e "  Backend (Functions): ${RED}FAILED${NC}"
  fi
fi

# Health checks
echo ""
echo "--- Health Checks ---"

if curl -sf http://localhost:5173 > /dev/null 2>&1; then
  echo -e "  Frontend:  ${GREEN}OK${NC}"
else
  echo -e "  Frontend:  ${RED}UNREACHABLE${NC}"
fi

if curl -sf http://localhost:5001/api/health > /dev/null 2>&1; then
  echo -e "  Backend:   ${GREEN}OK${NC}"
else
  echo -e "  Backend:   ${RED}UNREACHABLE${NC} (needed for: Strava sync, Add Photos, admin)"
fi

# Check .env
echo ""
echo "--- Config ---"
if [ -f "$(dirname "$0")/.env" ]; then
  echo -e "  .env file: ${GREEN}found${NC}"
else
  echo -e "  .env file: ${RED}MISSING${NC} (copy from .env.example)"
fi

echo ""
echo "=== Ready ==="
echo "  App:   http://localhost:5173"
echo "  Admin: http://localhost:5173/admin"
echo ""
echo "To stop: kill \$(lsof -ti :5173) \$(lsof -ti :5001)"
echo ""
