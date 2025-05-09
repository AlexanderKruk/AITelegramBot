import { openAi } from '../services/openAiService.js';
import { logAsyncFunctionTime } from '../utils/utils.js';
import { ERROR_MESSAGE, mode, scenarios } from '../constants.js';
import dailyUsage from '../helpers/dailyUsage.js';

export default async (ctx) => {
  try {
    ctx.sendChatAction('typing');
    if (await dailyUsage(ctx)) return;
    if (ctx.session.settings.mode === mode.scenario) {
      await ctx.replyWithHTML(
        `<b>You can say:</b>\n${scenarios[ctx.session?.currentScenarioIndex || 0].hints
          .map((item) => `- ${item}`)
          .join('\n')}`,
      );
      return;
    }
    const { message: response, cost: hintCost } =
      // eslint-disable-next-line no-unsafe-optional-chaining
      ctx?.session?.lastResponse &&
      (await logAsyncFunctionTime(
        () =>
          openAi.chat(
            {
              messages: [
                {
                  role: openAi.roles.SYSTEM,
                  content: `Give three answers to this question, each in one short and simple sentence in English. Use a bullet list.`,
                },
                { role: openAi.roles.USER, content: ctx.session.lastResponse },
              ],
            }.messages,
          ),
        'openAi - hint',
      ));
    ctx.session.userData.dayCost += hintCost || 0;
    // eslint-disable-next-line no-unused-expressions
    response && (await ctx.replyWithHTML(`<b>You can say:</b>\n${response.content}`));
  } catch (error) {
    console.log('Hint error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
