# Step 1: Build environment
FROM python:3.11-slim AS builder
WORKDIR /app
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Step 2: Runtime image
FROM python:3.11-slim
WORKDIR /app

# Install gunicorn and uvicorn
RUN pip install --no-cache-dir gunicorn uvicorn[standard]

# Copy installed deps from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy your app code
COPY . .

# Expose API port
EXPOSE 8000

# Launch via Gunicorn + Uvicorn worker
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:8000", "--workers", "4"]
