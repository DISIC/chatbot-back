import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { Events } from "@core/entities/events.entity";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Inbox } from "@core/entities/inbox.entity";
import { EventActionTypeEnum } from "@core/enums/event-action-type.enum";
import { Intent } from "@core/entities/intent.entity";
import { InboxStatus } from "@core/enums/inbox-status.enum";
import { IntentService } from "../intent/intent.service";
import { truncateString } from "@core/utils";
import { BotLogger } from "../logger/bot.logger";

@Injectable()
export class InboxFillService {
  private readonly _logger = new BotLogger('InboxFillService');

  constructor(@InjectRepository(Events)
              private readonly _eventsRepository: Repository<Events>,
              @InjectRepository(Inbox)
              private readonly _inboxesRepository: Repository<Inbox>,
              private readonly _intentService: IntentService) {
  }

  /**
   * Vérification des derniers événements de Rasa pour remplir la table des requêtes
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkEvents() {
    // Get max timestamp of inbox
    const maxTimestamp = (await this._inboxesRepository
      .createQueryBuilder()
      .select('MAX(timestamp)', 'timestamp')
      .getRawOne())?.timestamp;

    // Find all events which occurs after this timestamp
    const events: Events[] = await this._eventsRepository.find({
      where: {
        timestamp: MoreThan(maxTimestamp ? maxTimestamp : 0)
      },
      order: {
        sender_id: 'ASC',
        timestamp: 'ASC'
      }
    });

    if (events.length < 1) {
      return;
    }

    const inboxes: Inbox[] = [];
    while (events.length > 0) {
      const conversationIdx = events.findIndex(e => e.action_name === EventActionTypeEnum.action_listen);
      const eventsSlice = events.slice(0, conversationIdx + 1);
      if (this._canGenerateInbox(eventsSlice)) {
        const inbox = this._getNextInbox(eventsSlice);
        if (await this._intentService.intentExists(inbox.intent?.id)) {
          inboxes.push(this._getNextInbox(eventsSlice));
        }
      }
      conversationIdx >= 0 ? events.splice(0, conversationIdx + 1) : events.splice(0, events.length);
    }
    if (inboxes.length > 0) {
      await this._inboxesRepository.save(inboxes);
      this._logger.log(`Finishing updating ${inboxes.length} inbox`);
    }
  }

  private _getNextInbox(events: Events[]): Inbox {
    const inbox = new Inbox();
    let getMessageTimestamp: number;
    let sendMessageTimestamp: number;
    inbox.timestamp = Math.max.apply(Math, events.map(e => e.timestamp));

    inbox.sender_id = events[0]?.sender_id;
    inbox.event_id = events[0]?.id;
    inbox.response = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      // @ts-ignore
      let data = JSON.parse(event?.data);

      switch (data?.event) {
        case 'action':
          break;
        case 'bot':
          inbox.response.push({text: data.text, data: data.data});
          sendMessageTimestamp = data.timestamp;
          break;
        case 'user':
          if (data.parse_data?.intent?.name === 'nlu_fallback') {
            // @ts-ignore
            data.parse_data?.intent_ranking = data.parse_data?.intent_ranking?.filter(i => i.name !== 'nlu_fallback');
            // @ts-ignore
            data.parse_data?.intent = data.parse_data?.intent_ranking[0];
          }
          // Question is limited at 2000 char
          inbox.question = truncateString(data.text, 1900);
          inbox.confidence = data.parse_data?.intent?.confidence ? data.parse_data?.intent?.confidence : 0;
          inbox.intent_ranking = data.parse_data?.intent_ranking?.slice(0, 5);
          inbox.status = (inbox.confidence >= 0.6) ? (inbox.confidence >= 0.95) ? InboxStatus.confirmed : InboxStatus.to_verify : InboxStatus.pending
          inbox.intent = new Intent(data.parse_data?.intent?.name);
          getMessageTimestamp = data.timestamp;
          break;
      }
    }
    inbox.response = JSON.stringify(inbox.response);
    inbox.intent_ranking = JSON.stringify(inbox.intent_ranking);
    inbox.response_time = Math.round((sendMessageTimestamp - getMessageTimestamp) * 1000);
    if (isNaN(inbox.response_time)) {
      inbox.response_time = 100;
    }
    return inbox;
  }

  private _canGenerateInbox(events: Events[]): boolean {
    return events.findIndex(e => e.type_name === 'user') >= 0 && events.findIndex(e => e.type_name === 'bot') >= 0;
  }
}
