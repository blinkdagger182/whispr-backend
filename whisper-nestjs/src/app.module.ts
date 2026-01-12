import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { WhisperController } from './whisper.controller';
import { WhisperService } from './whisper.service';

@Module({
  imports: [],
  controllers: [AppController, ChatController, WhisperController],
  providers: [AppService, ChatService, WhisperService],
})
export class AppModule {}
