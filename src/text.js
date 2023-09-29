import { __dirname } from "./ogg.js"
import { resolve } from 'path';
import { readFileSync } from 'fs'
import axios from 'axios';
import jwt from 'jsonwebtoken';

class TextConverter {
  async getToken() {
    const key = JSON.parse(
      readFileSync(resolve(__dirname, "../aifriend-text-to-spech.json"), "utf-8")
    )

    const token = jwt.sign(
      {
        iss: key.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://www.googleapis.com/oauth2/v4/token',
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        iat: Math.floor(Date.now() / 1000),
      },
      key.private_key,
      { algorithm: 'RS256' }
    )

    const response = await axios.post(
      'https://www.googleapis.com/oauth2/v4/token',
      {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      }
    )
    return response.data.access_token
  }

  async textToSpeech(text, language) {
    try {
      const url = "https://us-central1-texttospeech.googleapis.com/v1beta1/text:synthesize";

      const calculateVoice = (language) => {
        switch (language) {
          case 'German': {
            return {
              "languageCode": "de-DE",
              "name": "de-DE-Polyglot-1"
            }
          }
          case 'English': {
            return {
              "languageCode": "en-US",
              "name": "en-US-Polyglot-1"
            }
          }
          default: {
          return {
            "languageCode": "en-GB",
            "name": "en-GB-Neural2-C"
            }
          }
        }
    }

    const data = {
      "audioConfig": {
        "audioEncoding": "OGG_OPUS",
        "effectsProfileId": [
          "handset-class-device"
        ],
        "pitch": 0,
        "speakingRate": 1
      },
      "input": { text },
      "voice": calculateVoice(language)
    }
      
    const accessToken = await this.getToken()
      
    const response = await axios({
      url,
      method: "POST",
      data,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
      return Buffer.from(response.data.audioContent, 'base64')
    } catch (error) {
      console.log('textToSpeech error', error.message)
    }
    
  }
}

export const textConverter = new TextConverter()