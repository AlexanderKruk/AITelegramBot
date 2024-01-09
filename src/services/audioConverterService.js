import axios from 'axios';
import { createWriteStream } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import installer from '@ffmpeg-installer/ffmpeg';
// import { removeFile } from '../utils/utils.js';

// eslint-disable-next-line no-underscore-dangle
export const __dirname = dirname(fileURLToPath(import.meta.url));

class OggConverter {
  constructor() {
    ffmpeg.setFfmpegPath(installer.path);
  }

  // eslint-disable-next-line class-methods-use-this
  async toMp3(input, output) {
    try {
      const outputPath = resolve(__dirname, '../voices', `${output}.mp3`);
      return new Promise((res, reject) => {
        ffmpeg(input)
          .inputOption('-t 30')
          .output(outputPath)
          .on('end', () => {
            // removeFile(input)
            res(outputPath);
          })
          .on('error', (error) => reject(error.message))
          .run();
      });
    } catch (error) {
      console.log('toMp3 error', error.message);
    }
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  async toWav(input, output) {
    try {
      const outputPath = resolve(__dirname, '../voices', `${output}.wav`);
      return new Promise((res, reject) => {
        ffmpeg(input)
          .toFormat('wav')
          .output(outputPath)
          .on('end', () => {
            // removeFile(input)
            res(outputPath);
          })
          .on('error', (error) => reject(error.message))
          .run();
      });
    } catch (error) {
      console.log('toWav error', error.message);
    }
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  async create(url, filename) {
    try {
      const oggPath = resolve(__dirname, '../voices', `${filename}.ogg`);
      const response = await axios({
        method: 'get',
        url,
        responseType: 'stream',
      });
      return new Promise((res) => {
        const stream = createWriteStream(oggPath);
        response.data.pipe(stream);
        stream.on('finish', () => res(oggPath));
      });
    } catch (error) {
      console.log('ogg create error', error.message);
    }
    return null;
  }
}

export const ogg = new OggConverter();
