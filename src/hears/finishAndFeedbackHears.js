import { Markup } from 'telegraf';
import { ERROR_MESSAGE } from '../constants.js';
import { openAi } from '../services/openAiService.js';
import { logAsyncFunctionTime, average } from '../utils/utils.js';

export default async (ctx) => {
  try {
    let userText = '';
    for (const message of ctx.session.messages) {
      if (message.role === openAi.roles.USER) {
        userText += ` ${message.content}`;
      }
    }
    if (userText.length > 300) {
      const { message: response, cost: feedbackCost } = await logAsyncFunctionTime(
        () =>
          openAi.chat(
            {
              messages: [
                {
                  role: openAi.roles.USER,
                  content: `My speech: "${userText}".
                  JSON fields:
                  "CEFR" : Cefr level of my speech,
                  "Good":  I need an advice two sentences about current grammar and vocabulary in my speech. Format string,
                  "Improve": I need an advice two sentences about what can be improved in grammar and vocabulary in my speech. Format string,
                  "Mistakes":  Write why my grammar is being corrected, no more than three grammar errors. Format an array of strings, one string per mistake.
                  `,
                },
              ],
            }.messages,
            'gpt-4-1106-preview',
            // 'gpt-3.5-turbo-1106',
            'json_object',
          ),
        'openAi - feedback',
      );
      ctx.session.userData.dayCost += feedbackCost;
      ctx.session.feedback = JSON.parse(response.content);
      ctx.session.averagePronunciationScore = average(ctx.session.pronounseScores);
      ctx.session.averageGrammarScore = average(ctx.session.grammarScores);
      await ctx.replyWithHTML(
        `<b>📊 Language level:</b> ${ctx.session.feedback.CEFR}\n<b>✏️ Grammar:</b> ${
          ctx.session.averageGrammarScore || '-'
        }%\n<b>🎙 Pronunciation:</b> ${
          ctx.session.averagePronunciationScore || '-'
        }%\n\n<b>👍 Already good:</b>\n${
          ctx.session.feedback.Good
        }\n\n<b>👉 Can be improved:</b>\n${
          ctx.session.feedback.Improve
        }\n\n<b>Grammar issues:</b>\n${ctx.session.feedback.Mistakes.map(
          (mistake) => `🔸 ${mistake}`,
        ).join('\n')}`,
        Markup.inlineKeyboard([
          [Markup.button.callback(`🌟 Start new lesson`, 'startNewLesson')],
        ]).resize(),
      );
      // await ctx.reply(
      //   'Your feedback',
      //   Markup.inlineKeyboard([
      //     [Markup.button.callback(`🌟 Start new lesson`, 'startNewLesson')],
      //   ]).resize(),
      // );
    } else {
      await ctx.reply("Let's talk a little bit more 😊");
    }
  } catch (error) {
    console.error('finish & feedback error:', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
