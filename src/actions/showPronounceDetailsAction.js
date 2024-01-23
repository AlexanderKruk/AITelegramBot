import { Markup } from 'telegraf';
import { ERROR_MESSAGE, mode } from '../constants.js';

export default async (ctx) => {
  try {
    ctx.editMessageText(
      `<b>Correct pronunciation:</b>\n${ctx.session.pronounceText}\n\nAccuracy: ${ctx.session.pronounce.accuracyScore}%  Fluency: ${ctx.session.pronounce.fluencyScore}%`,
      ctx.session.settings.mode === mode.scenario
        ? {
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  `🎯 ${
                    ctx.session?.currentScenarioGoals.filter((item) => item === true).length
                  }/4`,
                  'showGoalsDetails',
                ),
                Markup.button.callback(`✏️ ${ctx.session.grammarScore}%`, 'showGrammarDetails'),
                Markup.button.callback(`🎙 ${ctx.session.pronounce.pronounceScore}%`, 'empty'),
              ],
            ]),
            parse_mode: 'HTML',
          }
        : {
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback(`✏️ ${ctx.session.grammarScore}%`, 'showGrammarDetails'),
                Markup.button.callback(`🎙 ${ctx.session.pronounce.pronounceScore}%`, 'empty'),
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
