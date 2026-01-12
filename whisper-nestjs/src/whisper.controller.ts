import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { WhisperService } from './whisper.service';

type TranscribeBody = {
  language?: string;
  task?: string;
  vad_filter?: string | boolean;
};

@Controller()
export class WhisperController {
  constructor(private readonly whisperService: WhisperService) {}

  @Post('/transcribe')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'audio', maxCount: 1 },
    ]),
  )
  async transcribe(
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      audio?: Express.Multer.File[];
    },
    @Body() body: TranscribeBody,
  ) {
    const upload = files?.file?.[0] ?? files?.audio?.[0];
    if (!upload) {
      throw new BadRequestException('file is required');
    }

    return this.whisperService.transcribe(upload, body);
  }
}
