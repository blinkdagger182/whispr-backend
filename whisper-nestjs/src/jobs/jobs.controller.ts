import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('/:id')
  async getJob(@Param('id') id: string) {
    const job = await this.jobsService.getJob(id);
    if (!job) {
      throw new NotFoundException('job not found');
    }
    return job;
  }
}
