import { Markup } from 'telegraf';
import setChatGptSettings from './setChatGptSettingsAction.js';
import { ERROR_MESSAGE } from '../constants.js';
import selectMode from './selectModeAction.js';

export default async (ctx) => {
  try {
    ctx.session.userData.canWeWrite = false;
    ctx.editMessageText('In any case, we hope you find FluentSpeak useful 😉', {
      ...Markup.inlineKeyboard([[]]),
      parse_mode: 'HTML',
    });
    await setChatGptSettings(ctx);
    await selectMode(ctx);
  } catch (error) {
    console.log('canWeWriteNo error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
