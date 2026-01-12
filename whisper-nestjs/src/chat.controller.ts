import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import type { ChatRequest } from './chat.service';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('/chat')
  async createChat(@Body() body: ChatRequest) {
    if (!body?.messages || !Array.isArray(body.messages)) {
      throw new BadRequestException('messages must be an array');
    }
    return this.chatService.createChatCompletion(body);
  }
}
