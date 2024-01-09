import { INITIAL_SESSION, userData, ERROR_MESSAGE } from '../constants.js';
import { openAi } from '../services/openAiService.js';

const setChatGptSettings = async (ctx) => {
  try {
    ctx.session = {
      ...structuredClone(INITIAL_SESSION),
      userData: ctx.session.userData || userData,
    };
    ctx.session.userData.from = ctx.from;
    ctx.session.messages.push({
      role: openAi.roles.SYSTEM,
      content: `Act as an English teacher and my best friend. Let's practice some dialogues. Be proactive, sometimes ask questions. Expand my answers, suggest other solutions, tell interesting stories or jokes. Write in an emotional tone. Answer in no more than 2 sentences.`,
    });
  } catch (error) {
    console.error('setChatGptSettings: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};

export default setChatGptSettings;
