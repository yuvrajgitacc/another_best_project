FROM python:3.11-slim

WORKDIR /app

# System deps + Node.js for Vite builds
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy full monorepo (needed to build landing/admin/volunteer)
COPY . .

# Backend deps
RUN pip install --no-cache-dir -r backend/requirements.txt

# Build frontends into backend/static + seed DB (idempotent)
RUN chmod +x backend/build.sh && cd backend && ./build.sh

EXPOSE 8080

# Run from backend/ so `app.*` imports resolve
WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
