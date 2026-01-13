import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JobsService } from './jobs/jobs.service';
import { QueueService } from './queue/queue.service';
import { SpacesService } from './storage/spaces.service';

type TranscribeBody = {
  language?: string;
  task?: string;
  vad_filter?: string | boolean;
  webhook_url?: string;
};

@Injectable()
export class WhisperService {
  constructor(
    private readonly jobsService: JobsService,
    private readonly spacesService: SpacesService,
    private readonly queueService: QueueService,
  ) {}

  async enqueueTranscription(
    file: Express.Multer.File,
    body: TranscribeBody,
  ) {
    const key = `audio/${randomUUID()}-${file.originalname || 'audio'}`;
    await this.spacesService.uploadBuffer(
      key,
      file.buffer,
      file.mimetype || undefined,
    );

    const job = await this.jobsService.createJob({
      storageKey: key,
      originalFilename: file.originalname,
      contentType: file.mimetype,
      webhookUrl: body.webhook_url,
    });

    await this.queueService.publishJob(job.id);
    return { job_id: job.id };
  }
}
