# Step 1: Build environment
FROM python:3.11-slim AS builder

WORKDIR /app
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Step 2: Runtime image
FROM python:3.11-slim
WORKDIR /app
RUN useradd -u 1000 -m appuser
# Install gunicorn and uvicorn
RUN pip install --no-cache-dir gunicorn uvicorn[standard]

# Copy installed deps from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
ENV DATABASE_PATH=/data/app.db
ENV JWT_SECRET_KEY=${JWT_SECRET_KEY}
ENV ORS_API_KEY=${ORS_API_KEY}
# Copy your app code
COPY . .
#USER 1000:1000
RUN mkdir -p /data && chown -R appuser:appuser /data
USER appuser
# RUN chmod 755 /data
# RUN chown 1000:1000 /data
# Expose API port
EXPOSE 8000

COPY --chmod=755 docker-entrypoint.sh /entrypoint.sh
# RUN chown -R 10001:10001 /entrypoint.sh
# RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

# Launch via Gunicorn + Uvicorn worker
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:8000", "--workers", "4"]
