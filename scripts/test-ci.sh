#!/usr/bin/env bash
set -euo pipefail

echo "Installing Playwright browsers..."
npx playwright install --with-deps chromium

echo "Building Next.js app..."
npm run build

echo "Starting production server..."
nohup npm run start -- --hostname 127.0.0.1 --port 3000 > /tmp/nextstart.log 2>&1 &
echo $! > .next-start.pid

cleanup() {
  if [ -f .next-start.pid ]; then
    kill "$(cat .next-start.pid)" || true
    rm -f .next-start.pid
  fi
}

trap cleanup EXIT

npx wait-on http://127.0.0.1:3000 --timeout 60000

echo "Running Playwright tests..."
npm run test:e2e
