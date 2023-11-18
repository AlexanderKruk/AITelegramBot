import { openAi } from '../services/openAiService.js';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    await ctx.editMessageText('What do you want to talk about?');
    ctx.session.messages.push({
      role: openAi.roles.ASSISTANT,
      content: 'What do you want to talk about? Select a topic:',
    });
  } catch (error) {
    console.error('myOwnTopic: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
