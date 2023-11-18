import getTopic from '../actions/getTopicAction.js';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    // await setChatGptSettings(ctx);
    await getTopic(ctx);
  } catch (error) {
    console.error('Change topic error:', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
