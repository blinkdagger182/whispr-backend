import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { optionalEnv } from '../config';

type WebhookPayload = {
  job_id: string;
  status: 'completed';
  result: {
    text: string;
    language: string;
    segments: Array<{ start: number; end: number; text: string }>;
  };
};

@Injectable()
export class WebhookService {
  private readonly secret = optionalEnv(
    'WEBHOOK_SECRET',
    process.env.WEBHOOK_SECRET,
  );

  async deliver(url: string, payload: WebhookPayload): Promise<void> {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.secret) {
      const signature = createHmac('sha256', this.secret)
        .update(body)
        .digest('hex');
      headers['X-Whispr-Signature'] = signature;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`webhook failed: ${response.status} ${text}`);
    }
  }
}
