import { Module } from '@nestjs/common';
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { PublicController } from "./public.controller";
import { ChatbotConfigModule } from "../chatbot-config/chatbot-config.module";
import { IntentModule } from "../intent/intent.module";
import { FeedbackModule } from "../feedback/feedback.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatbotConfig]),
    ChatbotConfigModule,
    IntentModule,
    FeedbackModule
  ],
  controllers: [PublicController],
  providers: []
})
export class PublicModule {}
