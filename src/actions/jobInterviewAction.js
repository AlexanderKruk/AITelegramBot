import { Markup } from 'telegraf';
import { mode, ERROR_MESSAGE } from '../constants.js';
import { openAi } from '../services/openAiService.js';
import { textConverter } from '../services/textToSpeechService.js';

export default async (ctx) => {
  try {
    let source = null;
    if (ctx.session.settings.mode === mode.interview) {
      ctx.session.messages = [];
      ctx.session.messages.push({
        role: openAi.roles.SYSTEM,
        content: `Act as a job interviewer. I will be the candidate and you will ask me the interview questions for ${
          ctx.session.settings?.interview?.position ? ctx.session.settings.interview.position : ''
        } position. I want you to answer only as the interviewer. Do not write all the questions at once. Do not write explanations. Answer shortly with a maximum of 3 sentences.`,
      });
      const { message: response, cost: answerCost } = await openAi.chat(ctx.session.messages);
      ctx.session.lastResponse = response.content;
      ctx.session.messages.push({
        role: openAi.roles.ASSISTANT,
        content: response.content,
      });
      const { mp3, cost: textToSpeechCost } = await textConverter.textToSpeech(
        response.content,
        ctx.session.settings.practiceLanguage,
      );
      source = mp3;
      ctx.session.userData.dayCost += answerCost + textToSpeechCost;
    } else {
      ctx.editMessageText('💼 Job interview', {
        ...Markup.inlineKeyboard([[]]),
        parse_mode: 'HTML',
      });
      const { mp3, cost: textToSpeechCost } = await textConverter.textToSpeech(
        'What position are you applying for?',
        ctx.session.settings.practiceLanguage,
      );
      source = mp3;
      ctx.session.userData.dayCost += textToSpeechCost;
      ctx.session.settings.mode = mode.interviewPosition;
    }
    // eslint-disable-next-line no-unused-expressions
    source &&
      (await ctx.replyWithVoice(
        { source },
        Markup.keyboard([
          [Markup.button.callback(`🌐 Translate`), Markup.button.callback(`✨ Improve`)],
          [Markup.button.callback(`🔤 Show text`), Markup.button.callback(`🆘 Hint please`)],
          [Markup.button.callback(`🆕 New dialog`), Markup.button.callback(`🏁 Finish & feedback`)],
        ]).resize(),
      ));
  } catch (error) {
    console.error('jobInterview error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
