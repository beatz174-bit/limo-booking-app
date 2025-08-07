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
ENV DATABASE_PATH=./app.db
ENV JWT_SECRET_KEY=${JWT_SECRET_KEY}
ENV ORS_API_KEY=${ORS_API_KEY}
# Copy your app code
COPY . .

# Expose API port
EXPOSE 8000

COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

# Launch via Gunicorn + Uvicorn worker
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:8000", "--workers", "4"]
