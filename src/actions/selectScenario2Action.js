import selectScenarios from './selectScenariosAction.js';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    await selectScenarios(ctx, 2);
  } catch (error) {
    console.error('selectScenario2 error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
