import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';
import { WorkerService } from './worker/worker.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'error', 'warn'],
  });
  const worker = app.get(WorkerService);
  await worker.start();
}

bootstrap();
