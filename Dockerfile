# Dockerfile nativo para Backend FastAPI + Frontend HTML5
FROM python:3.11-slim AS production
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

COPY requirements.txt ./
RUN pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

# Usuario sin privilegios
RUN useradd --create-home --uid 1000 appuser
COPY --chown=appuser:appuser . .
RUN mkdir -p /app/data && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]