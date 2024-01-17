import { Markup } from 'telegraf';
import { ERROR_MESSAGE } from '../constants.js';
import dailyUsage from '../helpers/dailyUsage.js';

const selectMode = async (ctx) => {
  try {
    if (await dailyUsage(ctx)) return;
    await ctx.reply('Select mode:              &#x200D;', {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🎭 Scenarios', 'scenarios')],
        [Markup.button.callback('🗂️ Topics', 'getTopic')],
        [Markup.button.callback('💼 Job interview', 'jobInterview')],
      ]),
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('mainMenu error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};

export default selectMode;
