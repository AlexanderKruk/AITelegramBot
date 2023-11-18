import initialization from '../actions/initializationAction.js';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    if (!ctx.session.settings) {
      return initialization(ctx);
    }
    await ctx.reply('Please send me a voice 🎙 message.');
  } catch (error) {
    console.error('get text: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
