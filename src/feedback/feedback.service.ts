import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Feedback } from "@core/entities/feedback.entity";
import { Repository } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InboxService } from "../inbox/inbox.service";
import { In } from "typeorm/index";

@Injectable()
export class FeedbackService {

  constructor(@InjectRepository(Feedback)
              private readonly _feedbacksRepository: Repository<Feedback>,
              private readonly _inboxService: InboxService) {
  }

  async createSafe(feedback: Feedback): Promise<Feedback> {
    const fEntity = await this._feedbacksRepository.findOne({
      user_question: feedback.user_question,
      timestamp: feedback.timestamp
    });
    if (!fEntity) {
      return this._feedbacksRepository.save(feedback);
    }
    if (fEntity && fEntity.status !== feedback.status) {
      this._feedbacksRepository.update({id: fEntity.id}, {status: feedback.status});
    }
    return feedback;
  }

  // Check last feedbacks to update Inbox
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkFeedbacks() {
    const feedbacks: Feedback[] = await this._feedbacksRepository.find({
      order: {
        timestamp: 'ASC'
      }
    });

    if (feedbacks.length < 1) {
      return;
    }

    console.log(`${new Date().toLocaleString()} - Updating feedbacks`);
    const toDelete = [];
    for(let i = 0; i < feedbacks.length; i++) {
      const feedback = feedbacks[i];
      const updated = await this._inboxService.updateInboxWithFeedback(feedback);
      if(updated) {
        toDelete.push(feedback.id);
      }
    }
    if(toDelete && toDelete.length > 0) {
      await this._feedbacksRepository.delete({
        id: In(toDelete)
      });
    }
    console.log(`${new Date().toLocaleString()} - Finishing updating ${toDelete.length} feedbacks`);
  }
}