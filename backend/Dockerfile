FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Seed the database on build (SQLite included in container)
RUN python seed_data.py

# Expose port
EXPOSE 8080

# Cloud Run uses PORT env variable
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
