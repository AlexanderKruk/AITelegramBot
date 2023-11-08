import OpenAIApi from 'openai';
import config from 'config';
import { createReadStream } from 'fs';

class OpenAI {
  roles = {
    ASSISTANT: 'assistant',
    USER: 'user',
    SYSTEM: 'system',
  };

  constructor(apiKey) {
    this.openai = new OpenAIApi({ apiKey });
  }

  async chat(messages, model = 'gpt-3.5-turbo-1106', type = 'text') {
    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        response_format: { type },
      });
      return response.choices[0].message;
    } catch (error) {
      console.log('openai chat error', error.message);
    }
  }

  transcriptionLanguage = (language) => {
    switch (language) {
      case 'american':
        return 'en';
      case 'british':
        return 'en';
      case 'Polish':
        return 'pl';
      default:
        return 'en';
    }
  };

  async transcription(filepath, language) {
    try {
      const transcription = await this.openai.audio.transcriptions.create({
        file: createReadStream(filepath),
        model: 'whisper-1',
        language: this.transcriptionLanguage(language),
      });
      return transcription.text;
    } catch (error) {
      console.log('transcription error', error.message);
    }
  }
}

export const openAi = new OpenAI(config.get('OPENAI_KEY'));
