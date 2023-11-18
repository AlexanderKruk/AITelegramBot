import { openAi } from '../services/openAiService.js';
import { logAsyncFunctionTime } from '../utils/utils.js';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    ctx.sendChatAction('typing');
    const response =
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
    await ctx.replyWithHTML(`<b>You can say:</b>\n${response.content}`);
  } catch (error) {
    console.log('Hint error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
