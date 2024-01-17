import { Markup } from 'telegraf';
import { mode, ERROR_MESSAGE } from '../constants.js';
import { openAi } from '../services/openAiService.js';
import { textConverter } from '../services/textToSpeechService.js';

export default async (ctx) => {
  try {
    let source = null;
    ctx.session.settings.mode = mode.scenario;
    ctx.session.messages = [];
    ctx.session.messages.push({
      role: openAi.roles.SYSTEM,
      content: `Act as an English language teacher and my best friend. Let's practice some dialogues. Answer in the English language, with a maximum of 2 sentences. Please write in emotional tone.
Scenario: Your name is Alex. You are an outgoing, sociable student at an American university. Spotting a new face in class today, you decide to make them feel welcome by striking up a conversation and introducing yourself.`,
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

    // eslint-disable-next-line no-unused-expressions
    source &&
      (await ctx.replyWithVoice(
        { source },
        Markup.keyboard([
          [Markup.button.callback(`🌐 Translate`), Markup.button.callback(`✨ Improve`)],
          [Markup.button.callback(`🔤 Show text`), Markup.button.callback(`🆘 Hint please`)],
          [
            Markup.button.callback(`🔄 Select mode`),
            Markup.button.callback(`🏁 Finish & feedback`),
          ],
        ]).resize(),
      ));
  } catch (error) {
    console.error('scenario error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
