import { HttpException, Injectable } from '@nestjs/common';
import { requireEnv } from '../config';

type WhisperResponse = {
  text: string;
  language: string;
  segments: Array<{ start: number; end: number; text: string }>;
};

@Injectable()
export class WhisperClientService {
  private readonly baseUrl = requireEnv(
    'WHISPER_BASE_URL',
    process.env.WHISPER_BASE_URL,
  );

  async transcribe(
    buffer: Buffer,
    filename: string,
    contentType?: string,
  ): Promise<WhisperResponse> {
    const form = new FormData();
    const bytes = new Uint8Array(buffer);
    const blob = new Blob([bytes], {
      type: contentType || 'application/octet-stream',
    });
    form.append('file', blob, filename || 'audio');

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

    return data as WhisperResponse;
  }
}
