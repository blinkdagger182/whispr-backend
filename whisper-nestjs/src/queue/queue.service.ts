import { Injectable } from '@nestjs/common';
import amqplib, { Channel, ChannelModel } from 'amqplib';
import { numberEnv, requireEnv } from '../config';

type JobMessage = {
  jobId: string;
};

@Injectable()
export class QueueService {
  private connection: ChannelModel | null = null;
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
    if (this.channel) {
      return this.channel;
    }
    const url = requireEnv('RABBITMQ_URL', process.env.RABBITMQ_URL);
    const connection: ChannelModel = await amqplib.connect(url);
    const channel = await connection.createChannel();
    await channel.assertExchange(this.exchange, 'direct', {
        durable: true,
    });
    await channel.assertQueue(this.jobsQueue, { durable: true });
    await channel.assertQueue(this.retryQueue, {
      durable: true,
      arguments: {
        'x-message-ttl': this.retryDelayMs,
        'x-dead-letter-exchange': this.exchange,
        'x-dead-letter-routing-key': 'jobs',
      },
    });
    await channel.assertQueue(this.dlqQueue, { durable: true });
    await channel.bindQueue(this.jobsQueue, this.exchange, 'jobs');
    await channel.bindQueue(this.retryQueue, this.exchange, 'retry');
    await channel.bindQueue(this.dlqQueue, this.exchange, 'dlq');
    this.connection = connection;
    this.channel = channel;
    return channel;
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
