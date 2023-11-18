import { Markup } from 'telegraf';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    ctx.editMessageText(`<b>Correct grammar:</b>\n${ctx.session.diffText}`, {
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            `🎙 ${ctx.session.pronounce.pronounceScore}%`,
            'showPronounceDetails',
          ),
          Markup.button.callback(`✏️ ${ctx.session.grammarScore}%`, 'empty'),
        ],
      ]),
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('showGrammarDetails error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
