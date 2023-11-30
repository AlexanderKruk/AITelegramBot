import { __dirname } from './audioConverterService.js';
import config from 'config';
import OpenAIApi from 'openai';
import { prices } from '../constants.js';

class TextConverter {
  async textToSpeech(text, language) {
    try {
      const openai = new OpenAIApi({ apiKey: config.get('OPENAI_KEY') });
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: text,
        response_format: 'opus',
      });
      return { mp3: Buffer.from(await mp3.arrayBuffer()), cost: text.length * prices.tts.text };
    } catch (error) {
      console.log('textToSpeech error', error.message);
    }
  }
}

export const textConverter = new TextConverter();
