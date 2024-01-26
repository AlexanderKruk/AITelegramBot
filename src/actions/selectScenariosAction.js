import { Markup } from 'telegraf';
import { mode, ERROR_MESSAGE, scenarios } from '../constants.js';
import { openAi } from '../services/openAiService.js';
import { textConverter } from '../services/textToSpeechService.js';

const selectScenarios = async (ctx, index) => {
  try {
    let source = null;
    ctx.session.settings.mode = mode.scenario;
    ctx.session.messages = [];
    ctx.session.currentScenarioIndex = index + (ctx.session.userData.currentScenariosPage - 1) * 4;
    await ctx.editMessageText(
      `<b>${scenarios[ctx.session.currentScenarioIndex].title}</b>\n${
        scenarios[ctx.session.currentScenarioIndex].description
      }\n\n<b>🎯</b> ${scenarios[ctx.session.currentScenarioIndex].goals[0]}`,
      {
        parse_mode: 'HTML',
      },
    );
    ctx.session.messages.push({
      role: openAi.roles.SYSTEM,
      content: `Stick strictly to the scenario you're only responsible for one role. You don't have to do the dialogue for two roles. Be proactive, sometimes ask questions. Write in an emotional tone. Answer in no more than 2 sentences. Scenario: You are a woman. ${
        scenarios[ctx.session.currentScenarioIndex].prompt || ''
      }`,
    });
    const { message: response, cost: answerCost } = await openAi.chat(ctx.session.messages);
    ctx.session.lastResponse = response.content;
    ctx.session.messages.push({
      role: openAi.roles.ASSISTANT,
      content: response.content,
    });
    ctx.session.userData.messagesHistory ??= [];
    ctx.session.userData.messagesHistory.push(...ctx.session.messages);
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
          [Markup.button.callback(`🆕 New dialog`), Markup.button.callback(`🏁 Finish & feedback`)],
        ]).resize(),
      ));
  } catch (error) {
    console.error('select scenario error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};

export default selectScenarios;
