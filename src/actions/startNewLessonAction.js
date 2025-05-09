import { Markup } from 'telegraf';
import setChatGptSettings from './setChatGptSettingsAction.js';
import selectMode from './selectModeAction.js';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    ctx.editMessageText(
      `<b>📊 Language level:</b> ${ctx.session.feedback.CEFR}\n<b>✏️ Grammar:</b> ${
        ctx.session.averageGrammarScore || '-'
      }%\n<b>🎙 Pronunciation:</b> ${
        ctx.session.averagePronunciationScore || '-'
      }%\n\n<b>👍 Already good:</b>\n${ctx.session.feedback.Good}\n\n<b>👉 Can be improved:</b>\n${
        ctx.session.feedback.Improve
      }\n\n<b>Grammar issues:</b>\n${ctx.session.feedback.Mistakes.map(
        (mistake) => `🔸 ${mistake}`,
      ).join('\n')}`,
      {
        ...Markup.inlineKeyboard([[]]),
        parse_mode: 'HTML',
      },
    );
    if (ctx.session.userData.canWeWrite === null) {
      ctx.reply(
        'Thank you for using FluentSpeak 😊\nCould you answer a few simple questions about your experience?',
        Markup.inlineKeyboard([
          [Markup.button.callback('Yes, write me', 'canWeWriteYes')],
          [Markup.button.callback('No, thank you', 'canWeWriteNo')],
        ]),
      );
    } else {
      await setChatGptSettings(ctx);
      await selectMode(ctx);
    }
  } catch (error) {
    console.error('myOwnTopic: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
