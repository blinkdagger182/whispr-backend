from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from faster_whisper import WhisperModel

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()

MODEL_NAME = os.getenv("WHISPER_MODEL", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

_model: Optional[WhisperModel] = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(
            MODEL_NAME,
            device=DEVICE,
            compute_type=COMPUTE_TYPE,
        )
    return _model


@app.get("/whisper")
def index() -> FileResponse:
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/whisper/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/whisper/transcribe")
async def transcribe(
    audio: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    language: Optional[str] = Form(None),
    task: str = Form("transcribe"),
    vad_filter: bool = Form(True),
) -> JSONResponse:
    model = get_model()

    upload = audio or file
    if upload is None:
        return JSONResponse({"error": "missing file"}, status_code=400)

    suffix = Path(upload.filename or "audio").suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await upload.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language=language or None,
            task=task,
            vad_filter=vad_filter,
        )
        segment_list: list[dict[str, Any]] = []
        full_text_parts: list[str] = []
        for segment in segments:
            segment_list.append(
                {
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text,
                }
            )
            full_text_parts.append(segment.text)
        return JSONResponse(
            {
                "text": "".join(full_text_parts).strip(),
                "language": info.language,
                "segments": segment_list,
            }
        )
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
