import { Markup } from 'telegraf';
import { getRandomIndexes } from '../utils/utils.js';
import { ERROR_MESSAGE, topics, mode } from '../constants.js';
import dailyUsage from '../helpers/dailyUsage.js';
import { openAi } from '../services/openAiService.js';

export default async (ctx) => {
  try {
    if (await dailyUsage(ctx)) return;
    if (ctx.session.settings.mode !== mode.topic) {
      ctx.session.messages = [];
      ctx.session.messages.push({
        role: openAi.roles.SYSTEM,
        content: `Act as an English teacher and my best friend. Let's practice some dialogue. Be proactive, sometimes ask questions. Expand my answers, suggest other solutions, tell interesting stories or jokes. Write in an emotional tone. Answer in no more than 2 sentences.`,
      });
      ctx.session.settings.mode = mode.topic;
    }
    const topicIndexes = getRandomIndexes(130, 3);
    if (ctx?.session?.settings?.topics) {
      ctx.session.settings.topics = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const index of topicIndexes) {
        ctx.session.settings.topics.push(topics[index]);
      }
    }
    await ctx.editMessageText('What do you want to talk about?             &#x200D;', {
      ...Markup.inlineKeyboard([
        [Markup.button.callback(ctx.session.settings.topics[0], 'selectTopic0')],
        [Markup.button.callback(ctx.session.settings.topics[1], 'selectTopic1')],
        [Markup.button.callback(ctx.session.settings.topics[2], 'selectTopic2')],
        [
          Markup.button.callback('💭 My own topic', 'selectMyOwnTopic'),
          Markup.button.callback('🔄 Change topics', 'changeTopics'),
        ],
      ]),
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('getTopic: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
