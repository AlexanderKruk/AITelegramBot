import { INITIAL_SESSION, ERROR_MESSAGE } from '../constants.js';
import { openAi } from '../services/openAiService.js';

const setChatGptSettings = async (ctx) => {
  try {
    ctx.session = structuredClone(INITIAL_SESSION);
    ctx.session.messages.push({
      role: openAi.roles.SYSTEM,
      content: `Act as an English language teacher and my best friend. Let's practice some dialogues. Answer in the English language, with a maximum of 2 sentences. Ask a question at the end. Please write in emotional tone.`,
    });
  } catch (error) {
    console.error('setChatGptSettings: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};

export default setChatGptSettings;
