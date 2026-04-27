#!/usr/bin/env bash
# Render Build Script — builds backend + both frontends into one service
set -e

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Installing Node.js (for frontend builds) ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs || true

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
cp ../landing_page/public/SevaSetu.apk static/SevaSetu.apk 2>/dev/null || echo "No APK found, skipping"

echo "=== Seeding database ==="
python seed_data.py || echo "Seed skipped (maybe Turso)"

echo "=== Build complete! ==="
ls -la static/
