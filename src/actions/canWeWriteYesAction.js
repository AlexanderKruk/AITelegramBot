import { Markup } from 'telegraf';
import setChatGptSettings from './setChatGptSettingsAction.js';
import getTopic from './getTopicAction.js';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    ctx.session.userData.canWeWrite = true;
    ctx.editMessageText('Thank you for accepting to chat 😄', {
      ...Markup.inlineKeyboard([[]]),
      parse_mode: 'HTML',
    });
    await setChatGptSettings(ctx);
    await getTopic(ctx);
  } catch (error) {
    console.log('canWeWriteYes error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
