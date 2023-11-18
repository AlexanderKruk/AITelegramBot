import selectTopic from './selectTopicAction.js';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    await selectTopic(ctx, 0);
  } catch (error) {
    console.error('selectTopic0: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
