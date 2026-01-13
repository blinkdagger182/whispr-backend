import { Injectable } from '@nestjs/common';
import { numberEnv } from '../config';
import { JobsService } from '../jobs/jobs.service';
import { QueueService } from '../queue/queue.service';
import { SpacesService } from '../storage/spaces.service';
import { WhisperClientService } from '../whisper/whisper-client.service';
import { WebhookService } from '../webhook/webhook.service';

@Injectable()
export class WorkerService {
  private readonly maxAttempts = numberEnv(
    'MAX_ATTEMPTS',
    process.env.MAX_ATTEMPTS,
    3,
  );

  constructor(
    private readonly jobsService: JobsService,
    private readonly queueService: QueueService,
    private readonly spacesService: SpacesService,
    private readonly whisperClient: WhisperClientService,
    private readonly webhookService: WebhookService,
  ) {}

  async start(): Promise<void> {
    await this.queueService.consumeJobs(async (jobId) => {
      await this.handleJob(jobId);
    });
  }

  private async handleJob(jobId: string): Promise<void> {
    const job = await this.jobsService.getJob(jobId);
    if (!job) {
      return;
    }
    if (job.status === 'completed' || job.status === 'dlq') {
      return;
    }

    await this.jobsService.markProcessing(jobId);

    try {
      const buffer = await this.spacesService.downloadBuffer(job.storage_key);
      const result = await this.whisperClient.transcribe(
        buffer,
        job.original_filename || 'audio',
        job.content_type || undefined,
      );

      await this.jobsService.markCompleted(
        jobId,
        result.text,
        result.language,
        result.segments,
      );

      if (job.webhook_url) {
        try {
          await this.webhookService.deliver(job.webhook_url, {
            job_id: jobId,
            status: 'completed',
            result,
          });
          await this.jobsService.markWebhookStatus(jobId, 'delivered');
        } catch (error) {
          console.error('webhook delivery failed', error);
          await this.jobsService.markWebhookStatus(jobId, 'failed');
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown error';
      const attempts = job.attempts + 1;
      if (attempts >= this.maxAttempts) {
        await this.jobsService.markDlq(jobId, message, attempts);
        await this.queueService.publishDlq(jobId);
        return;
      }
      await this.jobsService.markFailed(jobId, message, attempts);
      await this.queueService.publishRetry(jobId);
    }
  }
}
