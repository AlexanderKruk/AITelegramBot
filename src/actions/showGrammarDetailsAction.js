import { Markup } from 'telegraf';
import { ERROR_MESSAGE, mode } from '../constants.js';

export default async (ctx) => {
  try {
    ctx.editMessageText(
      `<b>Correct grammar:</b>\n${ctx.session.diffText}`,
      ctx.session.settings.mode === mode.scenario
        ? {
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(`🎯 0/4`, 'empty'),
                Markup.button.callback(`✏️ ${ctx.session.grammarScore}%`, 'empty'),
                Markup.button.callback(
                  `🎙 ${ctx.session.pronounce.pronounceScore}%`,
                  'showPronounceDetails',
                ),
              ],
            ]),
            parse_mode: 'HTML',
          }
        : {
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(`✏️ ${ctx.session.grammarScore}%`, 'empty'),
                Markup.button.callback(
                  `🎙 ${ctx.session.pronounce.pronounceScore}%`,
                  'showPronounceDetails',
                ),
              ],
            ]),
            parse_mode: 'HTML',
          },
    );
  } catch (error) {
    console.error('showGrammarDetails error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
