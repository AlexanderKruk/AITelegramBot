import { Markup } from 'telegraf';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    ctx.editMessageText(
      `<b>Correct pronunciation:</b>\n${ctx.session.pronounceText}\n\nAccuracy: ${ctx.session.pronounce.accuracyScore}%  Fluency: ${ctx.session.pronounce.fluencyScore}%`,
      {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(`🎙 ${ctx.session.pronounce.pronounceScore}%`, 'empty'),
            Markup.button.callback(`✏️ ${ctx.session.grammarScore}%`, 'showGrammarDetails'),
          ],
        ]),
        parse_mode: 'HTML',
      },
    );
  } catch (error) {
    console.error('showPronounceDetails error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
