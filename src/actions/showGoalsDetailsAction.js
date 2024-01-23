import { Markup } from 'telegraf';
import { ERROR_MESSAGE, scenarios } from '../constants.js';

export default async (ctx) => {
  try {
    ctx.editMessageText(
      `<b>Scenario goals:</b>\n${scenarios[ctx.session?.currentScenarioIndex || 0].goals
        .map((item, index) => `${ctx.session?.currentScenarioGoals[index] ? '✅' : '✖️'} ${item}`)
        .join('\n')}`,

      {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              `🎯 ${ctx.session?.currentScenarioGoals.filter((item) => item === true).length}/4`,
              'empty',
            ),
            Markup.button.callback(`✏️ ${ctx.session.grammarScore}%`, 'showGrammarDetails'),
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
    console.error('showGoalsDetails error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
