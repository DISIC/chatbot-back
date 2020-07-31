import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { TypeOrmModule } from "@nestjs/typeorm";
import { Feedback } from "@core/entities/feedback.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback]),
  ],
  providers: [FeedbackService],
  exports: [FeedbackService]
})
export class FeedbackModule {
}
