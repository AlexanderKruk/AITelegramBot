import axios from 'axios';
import { createWriteStream } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import installer from '@ffmpeg-installer/ffmpeg';
import { removeFile } from '../utils/utils.js';

export const __dirname = dirname(fileURLToPath(import.meta.url));

class OggConverter {
  constructor() {
    ffmpeg.setFfmpegPath(installer.path);
  }

  async toMp3(input, output) {
    try {
      const outputPath = resolve(__dirname, '../voices', `${output}.mp3`);
      return new Promise((resolve, reject) => {
        ffmpeg(input)
          .inputOption('-t 30')
          .output(outputPath)
          .on('end', () => {
            // removeFile(input)
            resolve(outputPath);
          })
          .on('error', (error) => reject(error.message))
          .run();
      });
    } catch (error) {
      console.log('toMp3 error', error.message);
    }
  }

  async toWav(input, output) {
    try {
      const outputPath = resolve(__dirname, '../voices', `${output}.wav`);
      return new Promise((resolve, reject) => {
        ffmpeg(input)
          .toFormat('wav')
          .output(outputPath)
          .on('end', () => {
            // removeFile(input)
            resolve(outputPath);
          })
          .on('error', (error) => reject(error.message))
          .run();
      });
    } catch (error) {
      console.log('toWav error', error.message);
    }
  }

  async create(url, filename) {
    try {
      const oggPath = resolve(__dirname, '../voices', `${filename}.ogg`);
      const response = await axios({
        method: 'get',
        url,
        responseType: 'stream',
      });
      return new Promise((resolve, reject) => {
        const stream = createWriteStream(oggPath);
        response.data.pipe(stream);
        stream.on('finish', () => resolve(oggPath));
      });
    } catch (error) {
      console.log('ogg create error', error.message);
    }
  }
}

export const ogg = new OggConverter();
