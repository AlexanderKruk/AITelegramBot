import getTopic from './getTopicAction.js';
import setChatGptSettings from './setChatGptSettingsAction.js';
import { ERROR_MESSAGE } from '../constants.js';

const initialization = async (ctx) => {
  try {
    await ctx.reply(
      `Hi 👋, nice to meet you 😊\nI will help you practice and improve your English conversation skills`,
    );
    await setChatGptSettings(ctx);
    await getTopic(ctx);
  } catch (error) {
    console.error('initialization error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};

export default initialization;
