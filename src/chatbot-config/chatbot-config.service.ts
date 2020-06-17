import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { FindOneOptions, Repository } from "typeorm";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { MediaService } from "../media/media.service";
import { UpdateResult } from "typeorm/query-builder/result/UpdateResult";

@Injectable()
export class ChatbotConfigService {

  constructor(@InjectRepository(ChatbotConfig)
              private readonly _configRepository: Repository<ChatbotConfig>,
              private readonly  _mediaService: MediaService) {
  }

  getChatbotConfig(options?: FindOneOptions): Promise<ChatbotConfig> {
    return this._configRepository.findOne(1, options);
  }

  update(config: ChatbotConfig): Promise<UpdateResult> {
    return this._configRepository.update({id: 1}, config);
  }

  save(config: ChatbotConfig): Promise<ChatbotConfig> {
    return this._configRepository.save(config);
  }

  async delete(fromDb = true) {
    try {
      const currentConfig = await this.getChatbotConfig();
      await this._mediaService.deleteFile(currentConfig.icon);
      if(fromDb) {
        await this._configRepository.delete(1);
      }
    } catch (e) {
    }
  }

  static imageFileFilter = (req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|png|svg)$/)) {
      return callback(new HttpException('Seul les fichiers en .jpg, .png et .svg sont acceptés.', HttpStatus.BAD_REQUEST), false);
    }
    return callback(null, true);
  };

}
