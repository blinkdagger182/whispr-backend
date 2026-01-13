import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';

type WebhookResult = {
  text: string;
  language: string;
  segments: Array<{ start: number; end: number; text: string }>;
};

type WebhookPayload = {
  job_id: string;
  status: 'completed';
  result: WebhookResult;
};

@Controller('/webhooks')
export class WebhookController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('/transcribe')
  async handleTranscribe(@Body() body: WebhookPayload) {
    if (!body?.job_id || !body?.result) {
      throw new BadRequestException('job_id and result are required');
    }

    const job = await this.jobsService.getJob(body.job_id);
    if (!job) {
      throw new BadRequestException('job not found');
    }

    if (job.status !== 'completed') {
      await this.jobsService.markCompleted(
        job.id,
        body.result.text,
        body.result.language,
        body.result.segments,
      );
    }

    await this.jobsService.markWebhookStatus(job.id, 'delivered');
    return { status: 'ok' };
  }
}
