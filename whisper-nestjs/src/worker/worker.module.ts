import { Module } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { QueueService } from '../queue/queue.service';
import { SpacesService } from '../storage/spaces.service';
import { WhisperClientService } from '../whisper/whisper-client.service';
import { WebhookService } from '../webhook/webhook.service';
import { WorkerService } from './worker.service';

@Module({
  providers: [
    JobsService,
    QueueService,
    SpacesService,
    WhisperClientService,
    WebhookService,
    WorkerService,
  ],
})
export class WorkerModule {}
