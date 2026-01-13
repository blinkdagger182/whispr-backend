import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { requireEnv } from '../config';

@Injectable()
export class SpacesService {
  private readonly client = new S3Client({
    region: requireEnv('SPACES_REGION', process.env.SPACES_REGION),
    endpoint: requireEnv('SPACES_ENDPOINT', process.env.SPACES_ENDPOINT),
    credentials: {
      accessKeyId: requireEnv('SPACES_KEY', process.env.SPACES_KEY),
      secretAccessKey: requireEnv('SPACES_SECRET', process.env.SPACES_SECRET),
    },
  });
  private readonly bucket = requireEnv(
    'SPACES_BUCKET',
    process.env.SPACES_BUCKET,
  );

  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType?: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async downloadBuffer(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const body = response.Body;
    if (!body) {
      throw new Error('Spaces object body is empty');
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
