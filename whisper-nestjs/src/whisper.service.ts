import { HttpException, Injectable } from '@nestjs/common';

type TranscribeBody = {
  language?: string;
  task?: string;
  vad_filter?: string | boolean;
};

@Injectable()
export class WhisperService {
  private readonly baseUrl =
    process.env.WHISPER_BASE_URL || 'http://localhost:8080/whisper';

  async transcribe(file: Express.Multer.File, body: TranscribeBody) {
    const form = new FormData();
    const bytes = new Uint8Array(file.buffer);
    const blob = new Blob([bytes], {
      type: file.mimetype || 'application/octet-stream',
    });
    form.append('file', blob, file.originalname || 'audio');

    if (body.language) {
      form.append('language', body.language);
    }
    if (body.task) {
      form.append('task', body.task);
    }
    if (body.vad_filter !== undefined) {
      form.append('vad_filter', String(body.vad_filter));
    }

    const response = await fetch(`${this.baseUrl}/transcribe`, {
      method: 'POST',
      body: form,
    });

    const text = await response.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // Keep raw text for non-JSON errors.
    }

    if (!response.ok) {
      throw new HttpException(data as string, response.status);
    }

    return data;
  }
}
