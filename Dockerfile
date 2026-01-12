FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt requirements.server.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements.server.txt

COPY faster_whisper ./faster_whisper
COPY server ./server
COPY setup.py setup.cfg MANIFEST.in README.md ./

EXPOSE 8080

ENV WHISPER_MODEL=tiny \
    WHISPER_DEVICE=cpu \
    WHISPER_COMPUTE_TYPE=int8

CMD ["sh", "-c", "python -m uvicorn server.app:app --host 0.0.0.0 --port ${PORT:-8080}"]
