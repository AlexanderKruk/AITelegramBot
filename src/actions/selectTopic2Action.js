import selectTopic from './selectTopicAction.js';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    await selectTopic(ctx, 2);
  } catch (error) {
    console.error('selectTopic2 error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
