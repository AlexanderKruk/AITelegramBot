import { Markup } from 'telegraf';
import { ERROR_MESSAGE } from '../constants.js';
import { calculateScenariosMenuButtons } from '../utils/utils.js';

export default async (ctx) => {
  try {
    // await ctx.editMessageText('<b>Mode:</b> 🎬 Scenarios', {
    //   ...Markup.inlineKeyboard([[]]),
    //   parse_mode: 'HTML',
    // });
    await ctx.editMessageText('Select scenario:                &#x200D;', {
      ...Markup.inlineKeyboard([
        ...calculateScenariosMenuButtons(ctx),
        [
          Markup.button.callback('⬅️', 'scenariosMenuPrevPage'),
          Markup.button.callback(
            `${ctx.session.userData.currentScenariosPage}/${ctx.session.maxScenariosPage}`,
            'none',
          ),
          Markup.button.callback('➡️', 'scenariosMenuNextPage'),
        ],
      ]),
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('scenario error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
