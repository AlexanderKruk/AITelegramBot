import { ERROR_MESSAGE } from '../constants.js';
import dailyUsage from '../helpers/dailyUsage.js';
import { openAi } from '../services/openAiService.js';
import { logAsyncFunctionTime } from '../utils/utils.js';

export default async (ctx) => {
  try {
    ctx.sendChatAction('typing');
    if (await dailyUsage(ctx)) return;
    if (ctx.session.userData.from.language_code === 'en') {
      await ctx.replyWithHTML(
        `To get the translation, change Telegram's language from English to your native language and click /start`,
      );
      return;
    }
    ctx.sendChatAction('typing');
    const { message: response, cost: translateCost } =
      // eslint-disable-next-line no-unsafe-optional-chaining
      ctx?.session?.lastResponse &&
      (await logAsyncFunctionTime(
        () =>
          openAi.chat(
            {
              messages: [
                {
                  role: openAi.roles.SYSTEM,
                  content: `Translate what I am writing to language with language code ${ctx.session.userData.from.language_code}. I need only translation, not explanation.`,
                },
                { role: openAi.roles.USER, content: ctx.session.lastResponse },
              ],
            }.messages,
          ),
        'openAi - translate',
      ));
    ctx.session.userData.dayCost += translateCost || 0;
    // eslint-disable-next-line no-unused-expressions
    response && (await ctx.replyWithHTML(`<b>Translation:</b>\n${response.content}`));
  } catch (error) {
    console.error('Translation error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
