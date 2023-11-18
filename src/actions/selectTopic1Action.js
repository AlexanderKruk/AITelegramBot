import selectTopic from './selectTopicAction.js';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    await selectTopic(ctx, 1);
  } catch (error) {
    console.error('selectTopic1: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
