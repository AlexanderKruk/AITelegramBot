import selectMode from '../actions/selectModeAction.js';
import { ERROR_MESSAGE } from '../constants.js';
import dailyUsage from '../helpers/dailyUsage.js';
import setChatGptSettings from '../actions/setChatGptSettingsAction.js';

export default async (ctx) => {
  try {
    await setChatGptSettings(ctx);
    if (await dailyUsage(ctx)) return;
    await selectMode(ctx);
  } catch (error) {
    console.error('Select mode error:', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
