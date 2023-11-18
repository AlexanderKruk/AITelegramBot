import { getRandomIndexes } from '../utils/utils.js';
import { ERROR_MESSAGE, topics } from '../constants.js';
import { Markup } from 'telegraf';

const getTopic = async (ctx) => {
  try {
    const topicIndexes = getRandomIndexes(130, 3);
    if (ctx?.session?.settings?.topics) {
      ctx.session.settings.topics = [];
      for (const index of topicIndexes) {
        ctx.session.settings.topics.push(topics[index]);
      }
    }
    await ctx.reply('What do you want to talk about?             &#x200D;', {
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

export default getTopic;
