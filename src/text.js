import { __dirname } from './ogg.js';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import config from 'config';
import fs from 'fs';
import path from 'path';
import OpenAIApi from 'openai';

class TextConverter {
  pathToKey =
    config.get('ENV') === 'prod'
      ? '../google-text-to-speech-prod.json'
      : '../google-text-to-speech-dev.json';

  async getToken() {
    const key = JSON.parse(
      readFileSync(resolve(__dirname, this.pathToKey), 'utf-8'),
    );

    const token = jwt.sign(
      {
        iss: key.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://www.googleapis.com/oauth2/v4/token',
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        iat: Math.floor(Date.now() / 1000),
      },
      key.private_key,
      { algorithm: 'RS256' },
    );

    const response = await axios.post(
      'https://www.googleapis.com/oauth2/v4/token',
      {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      },
    );
    return response.data.access_token;
  }

  async textToSpeech(text, language) {
    try {
      const openai = new OpenAIApi({ apiKey: config.get('OPENAI_KEY') });
      const speechFile = path.resolve('./speech.mp3');
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
