import { openAi } from '../services/openAiService.js';
import { textConverter } from '../services/textToSpeechService.js';
import { Markup } from 'telegraf';

const selectTopic = async (ctx, index) => {
  try {
    ctx.sendChatAction('record_voice');
    ctx.session.settings.selectedTopic = ctx.session.settings.topics[index];
    ctx?.session?.settings?.selectedTopic &&
      ctx.editMessageText(`<b>Topic:</b> ${ctx.session.settings.selectedTopic}`, {
        parse_mode: 'HTML',
      });
    ctx.session.messages.push({
      role: openAi.roles.USER,
      content: `Let's discuss: ${ctx.session.settings.selectedTopic?.slice(2)}.`,
    });
    const { message: response, cost: answerCost } = await openAi.chat(ctx.session.messages);
    ctx.session.lastResponse = response.content;
    ctx.session.messages.push({
      role: openAi.roles.ASSISTANT,
      content: response.content,
    });
    const { mp3: source, cost: textToSpeechCost } = await textConverter.textToSpeech(
      response.content,
      ctx.session.settings.practiceLanguage,
    );
    ctx.session.userData.dayCost += answerCost + textToSpeechCost;
    await ctx.replyWithVoice(
      { source },
      Markup.keyboard([
        [Markup.button.callback(`🔤 Show text`), Markup.button.callback(`🆘 Hint please`)],
        [Markup.button.callback(`🔄 Change topic`), Markup.button.callback(`🏁 Finish & feedback`)],
      ]).resize(),
    );
  } catch (error) {
    console.error('selectTopic: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};

export default selectTopic;
