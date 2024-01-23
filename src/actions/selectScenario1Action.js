import selectScenarios from './selectScenariosAction.js';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    await selectScenarios(ctx, 1);
  } catch (error) {
    console.error('selectScenario0 error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
