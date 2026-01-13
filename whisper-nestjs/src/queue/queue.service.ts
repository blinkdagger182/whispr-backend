import { Injectable } from '@nestjs/common';
import amqplib, { Channel, Connection } from 'amqplib';
import { numberEnv, requireEnv } from '../config';

type JobMessage = {
  jobId: string;
};

@Injectable()
export class QueueService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly exchange = 'transcribe.direct';
  private readonly jobsQueue = 'transcribe.jobs';
  private readonly retryQueue = 'transcribe.retry';
  private readonly dlqQueue = 'transcribe.dlq';
  private readonly retryDelayMs = numberEnv(
    'RETRY_DELAY_MS',
    process.env.RETRY_DELAY_MS,
    60_000,
  );

  private async getChannel(): Promise<Channel> {
    if (!this.channel) {
      const url = requireEnv('RABBITMQ_URL', process.env.RABBITMQ_URL);
      this.connection = await amqplib.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'direct', {
        durable: true,
      });
      await this.channel.assertQueue(this.jobsQueue, { durable: true });
      await this.channel.assertQueue(this.retryQueue, {
        durable: true,
        arguments: {
          'x-message-ttl': this.retryDelayMs,
          'x-dead-letter-exchange': this.exchange,
          'x-dead-letter-routing-key': 'jobs',
        },
      });
      await this.channel.assertQueue(this.dlqQueue, { durable: true });
      await this.channel.bindQueue(this.jobsQueue, this.exchange, 'jobs');
      await this.channel.bindQueue(this.retryQueue, this.exchange, 'retry');
      await this.channel.bindQueue(this.dlqQueue, this.exchange, 'dlq');
    }
    return this.channel;
  }

  async publishJob(jobId: string): Promise<void> {
    const channel = await this.getChannel();
    const payload: JobMessage = { jobId };
    channel.publish(this.exchange, 'jobs', Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
  }

  async publishRetry(jobId: string): Promise<void> {
    const channel = await this.getChannel();
    const payload: JobMessage = { jobId };
    channel.publish(
      this.exchange,
      'retry',
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }

  async publishDlq(jobId: string): Promise<void> {
    const channel = await this.getChannel();
    const payload: JobMessage = { jobId };
    channel.publish(this.exchange, 'dlq', Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
  }

  async consumeJobs(
    handler: (jobId: string) => Promise<void>,
  ): Promise<void> {
    const channel = await this.getChannel();
    await channel.consume(
      this.jobsQueue,
      async (message) => {
        if (!message) {
          return;
        }
        try {
          const payload = JSON.parse(
            message.content.toString('utf-8'),
          ) as JobMessage;
          await handler(payload.jobId);
          channel.ack(message);
        } catch (error) {
          console.error('queue handler failed', error);
          channel.nack(message, false, false);
        }
      },
      { noAck: false },
    );
  }
}
