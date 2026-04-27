FROM python:3.11-slim

WORKDIR /app

# Install system dependencies + Node.js (for building Vite frontends)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Build frontends into backend/static and seed DB (idempotent)
RUN chmod +x build.sh && ./build.sh

# Expose port
EXPOSE 8080

# Cloud Run uses PORT env variable
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
