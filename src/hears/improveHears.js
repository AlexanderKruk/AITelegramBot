import { ERROR_MESSAGE } from '../constants.js';
import dailyUsage from '../helpers/dailyUsage.js';
import { openAi } from '../services/openAiService.js';
import { logAsyncFunctionTime } from '../utils/utils.js';

export default async (ctx) => {
  try {
    ctx.sendChatAction('typing');
    if (await dailyUsage(ctx)) return;
    if (ctx.session.lastUserMessage === '') {
      await ctx.replyWithHTML(`Send a voice 🎙 message, then you can click ✨ Improve`);
      return;
    }
    ctx.sendChatAction('typing');
    const { message: response, cost: improveCost } =
      // eslint-disable-next-line no-unsafe-optional-chaining
      ctx?.session?.lastUserMessage &&
      (await logAsyncFunctionTime(
        () =>
          openAi.chat(
            {
              messages: [
                {
                  role: openAi.roles.SYSTEM,
                  content: `Improve the readability and clarity of this text.`,
                },
                { role: openAi.roles.USER, content: ctx.session.lastUserMessage },
              ],
            }.messages,
          ),
        'openAi - improve',
      ));
    ctx.session.userData.dayCost += improveCost || 0;
    // eslint-disable-next-line no-unused-expressions
    response && (await ctx.replyWithHTML(`<b>Improvement:</b>\n${response.content}`));
  } catch (error) {
    console.error('Improve error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
