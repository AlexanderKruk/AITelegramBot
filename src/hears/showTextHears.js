import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    ctx.sendChatAction('typing');
    await ctx.reply(ctx.session.lastResponse);
  } catch (error) {
    console.error('Show text error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
