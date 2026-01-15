import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getPool } from '../db';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'dlq';

export type JobRecord = {
  id: string;
  status: JobStatus;
  attempts: number;
  storage_key: string;
  original_filename: string | null;
  content_type: string | null;
  webhook_url: string | null;
  webhook_status: string | null;
  result_text: string | null;
  result_language: string | null;
  result_segments: unknown | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

export type CreateJobInput = {
  storageKey: string;
  originalFilename?: string;
  contentType?: string;
  webhookUrl?: string;
};

@Injectable()
export class JobsService {
  async createJob(input: CreateJobInput): Promise<JobRecord> {
    const pool = getPool();
    const id = randomUUID();
    const result = await pool.query<JobRecord>(
      `
      insert into jobs (
        id,
        status,
        attempts,
        storage_key,
        original_filename,
        content_type,
        webhook_url,
        webhook_status
      )
      values ($1, 'queued', 0, $2, $3, $4, $5, 'pending')
      returning *
      `,
      [
        id,
        input.storageKey,
        input.originalFilename ?? null,
        input.contentType ?? null,
        input.webhookUrl ?? null,
      ],
    );
    return result.rows[0];
  }

  async getJob(id: string): Promise<JobRecord | null> {
    const pool = getPool();
    const result = await pool.query<JobRecord>(
      'select * from jobs where id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }

  async markProcessing(id: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `
      update jobs
      set status = 'processing', updated_at = now()
      where id = $1
      `,
      [id],
    );
  }

  async markCompleted(
    id: string,
    resultText: string,
    resultLanguage: string,
    resultSegments: unknown,
  ): Promise<void> {
    const pool = getPool();
    const segmentsJson =
      resultSegments === null || resultSegments === undefined
        ? null
        : JSON.stringify(resultSegments);
    await pool.query(
      `
      update jobs
      set status = 'completed',
          result_text = $2,
          result_language = $3,
          result_segments = $4::jsonb,
          updated_at = now()
      where id = $1
      `,
      [id, resultText, resultLanguage, segmentsJson],
    );
  }

  async markFailed(id: string, error: string, attempts: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      `
      update jobs
      set status = 'failed',
          attempts = $2,
          last_error = $3,
          updated_at = now()
      where id = $1
      `,
      [id, attempts, error],
    );
  }

  async markDlq(id: string, error: string, attempts: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      `
      update jobs
      set status = 'dlq',
          attempts = $2,
          last_error = $3,
          updated_at = now()
      where id = $1
      `,
      [id, attempts, error],
    );
  }

  async markWebhookStatus(
    id: string,
    status: 'pending' | 'delivered' | 'failed',
  ): Promise<void> {
    const pool = getPool();
    await pool.query(
      `
      update jobs
      set webhook_status = $2,
          updated_at = now()
      where id = $1
      `,
      [id, status],
    );
  }
}
