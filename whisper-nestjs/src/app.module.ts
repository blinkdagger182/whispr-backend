import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { JobsController } from './jobs/jobs.controller';
import { JobsService } from './jobs/jobs.service';
import { QueueService } from './queue/queue.service';
import { SpacesService } from './storage/spaces.service';
import { WebhookController } from './webhook/webhook.controller';
import { WhisperController } from './whisper.controller';
import { WhisperService } from './whisper.service';

@Module({
  imports: [],
  controllers: [
    AppController,
    ChatController,
    WhisperController,
    JobsController,
    WebhookController,
  ],
  providers: [
    AppService,
    ChatService,
    WhisperService,
    JobsService,
    QueueService,
    SpacesService,
  ],
})
export class AppModule {}
