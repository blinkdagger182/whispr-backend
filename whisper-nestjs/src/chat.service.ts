import { HttpException, Injectable } from '@nestjs/common';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
};

@Injectable()
export class ChatService {
  private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  async createChatCompletion(body: ChatRequest) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new HttpException('OPENROUTER_API_KEY is not set', 500);
    }

    const payload = {
      model: body.model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages: body.messages,
    };

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    if (process.env.OPENROUTER_REFERER) {
      headers['HTTP-Referer'] = process.env.OPENROUTER_REFERER;
    }
    if (process.env.OPENROUTER_TITLE) {
      headers['X-Title'] = process.env.OPENROUTER_TITLE;
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
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
