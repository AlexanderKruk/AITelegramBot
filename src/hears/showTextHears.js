import { ERROR_MESSAGE } from '../constants.js';
import dailyUsage from '../helpers/dailyUsage.js';

export default async (ctx) => {
  try {
    ctx.sendChatAction('typing');
    if (await dailyUsage(ctx)) return;
    await ctx.reply(ctx.session.lastResponse);
  } catch (error) {
    console.error('Show text error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
