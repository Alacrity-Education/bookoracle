# syntax=docker/dockerfile:1

FROM python:3.13-slim AS base

# Predictable Python behaviour in containers: no .pyc litter, unbuffered logs
# so uvicorn output reaches `docker logs` immediately.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies first, in their own layer: requirements.txt changes far less
# often than application code, so this stays cached across most builds.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Writable mount point for the collected CSVs (see DATA_OUTPUT_DIR below).
# Created and chowned before dropping privileges.
RUN mkdir -p /data && \
    useradd --create-home --uid 10001 lira && \
    chown -R lira:lira /data

USER lira

# Send participations.csv / newsletter.csv to the volume rather than into
# app/data, so the seed JSON in the image stays replaceable on each deploy.
ENV DATA_OUTPUT_DIR=/data

EXPOSE 8000

# No curl in the slim image, so the check uses the stdlib.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/', timeout=4).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
