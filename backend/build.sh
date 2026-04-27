#!/usr/bin/env bash
# Render Build Script — builds backend + both frontends into one service
set -e

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Building Landing Page ==="
cd ../landing_page
npm install
npm run build

echo "=== Building Admin Dashboard ==="
cd ../admin-dashboard
npm install
npm run build

echo "=== Copying static files to backend/static ==="
cd ../backend
mkdir -p static

# Copy landing page build
cp -r ../landing_page/dist/* static/

# Copy admin dashboard into static/admin/
mkdir -p static/admin
cp -r ../admin-dashboard/dist/* static/admin/

# Copy APK if exists
cp ../landing_page/public/SevaSetu.apk static/SevaSetu.apk 2>/dev/null || echo "No APK in landing, checking root..."
cp static/SevaSetu.apk static/SevaSetu.apk 2>/dev/null || echo "APK will be served from static/"

echo "=== Seeding database (local SQLite) ==="
# Force local SQLite for seeding (ignore Turso vars)
DATABASE_URL="sqlite:///./smartalloc.db" TURSO_DATABASE_URL="" TURSO_AUTH_TOKEN="" python seed_data.py

echo "=== Build complete! ==="
ls -la static/
echo "=== DB seeded ==="
ls -la smartalloc.db 2>/dev/null || echo "DB check done"
