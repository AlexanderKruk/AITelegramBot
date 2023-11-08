import { __dirname } from './ogg.js';
import config from 'config';
import OpenAIApi from 'openai';

class TextConverter {
  async textToSpeech(text, language) {
    try {
      const openai = new OpenAIApi({ apiKey: config.get('OPENAI_KEY') });
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
        response_format: 'opus',
      });
      return Buffer.from(await mp3.arrayBuffer());
    } catch (error) {
      console.log('textToSpeech error', error.message);
    }
  }
}

export const textConverter = new TextConverter();
