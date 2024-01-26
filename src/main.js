import { Telegraf } from 'telegraf';
import config from 'config';
import { message } from 'telegraf/filters';
import { ERROR_MESSAGE } from './constants.js';
import ga4 from './middlewares/gaMiddleware.js';
import session from './middlewares/sessionMiddleware.js';
import startAction from './actions/startAction.js';
import changeTopicsAction from './actions/changeTopicsAction.js';
import selectTopic0Action from './actions/selectTopic0Action.js';
import selectTopic1Action from './actions/selectTopic1Action.js';
import selectTopic2Action from './actions/selectTopic2Action.js';
import selectMyOwnTopicAction from './actions/selectMyOwnTopicAction.js';
import showGrammarDetailsAction from './actions/showGrammarDetailsAction.js';
import showPronounceDetailsAction from './actions/showPronounceDetailsAction.js';
import showGoalsDetailsAction from './actions/showGoalsDetailsAction.js';
import showTextHears from './hears/showTextHears.js';
import hintPleaseHears from './hears/hintPleaseHears.js';
import selectModeHears from './hears/selectModeHears.js';
import improveHears from './hears/improveHears.js';
import finishAndFeedbackHears from './hears/finishAndFeedbackHears.js';
import messageVoiceOn from './on/messageVoiceOn.js';
import messageTextOn from './on/messageTextOn.js';
import startNewLessonAction from './actions/startNewLessonAction.js';
import canWeWriteYesAction from './actions/canWeWriteYesAction.js';
import canWeWriteNoAction from './actions/canWeWriteNoAction.js';
import subscribeAction from './actions/subscribeAction.js';
import jobInterviewAction from './actions/jobInterviewAction.js';
import getTopicAction from './actions/getTopicAction.js';
import translateHears from './hears/translatedHears.js';
import scenariosMenuAction from './actions/scenariosMenuAction.js';
import scenariosMenuNextPageAction from './actions/scenariosMenuNextPageAction.js';
import scenariosMenuPrevPageAction from './actions/scenariosMenuPrevPageAction.js';
import selectScenario0Action from './actions/selectScenario0Action.js';
import selectScenario1Action from './actions/selectScenario1Action.js';
import selectScenario2Action from './actions/selectScenario2Action.js';
import selectScenario3Action from './actions/selectScenario3Action.js';

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

bot.use(session);
bot.use(ga4.middleware());

bot.telegram.setMyCommands([
  { command: '/start', description: 'Start' },
  { command: '/subscribe', description: 'Subscribe' },
]);

bot.command('start', ga4.view('start'), startAction);
bot.command('subscribe', ga4.view('subscribe'), subscribeAction);

bot.action('getTopic', ga4.view('get topic'), getTopicAction);
bot.action('changeTopics', ga4.view('topics change'), changeTopicsAction);
bot.action('jobInterview', ga4.view('job interview'), jobInterviewAction);

bot.action('scenariosMenu', ga4.view('scenarios menu'), scenariosMenuAction);
bot.action('selectScenario0', ga4.view('scenarios selected'), selectScenario0Action);
bot.action('selectScenario1', ga4.view('scenarios selected'), selectScenario1Action);
bot.action('selectScenario2', ga4.view('scenarios selected'), selectScenario2Action);
bot.action('selectScenario3', ga4.view('scenarios selected'), selectScenario3Action);
bot.action('scenariosMenuNextPage', ga4.view('scenarios next page'), scenariosMenuNextPageAction);
bot.action('scenariosMenuPrevPage', ga4.view('scenarios prev page'), scenariosMenuPrevPageAction);

bot.action('selectTopic0', ga4.view('topic selected'), selectTopic0Action);
bot.action('selectTopic1', ga4.view('topic selected'), selectTopic1Action);
bot.action('selectTopic2', ga4.view('topic selected'), selectTopic2Action);
bot.action('selectMyOwnTopic', ga4.view('my own topic'), selectMyOwnTopicAction);

bot.action('startNewLesson', ga4.view('start new lesson'), startNewLessonAction);

bot.action('showGoalsDetails', ga4.view('show goals details'), showGoalsDetailsAction);
bot.action('showGrammarDetails', ga4.view('show grammar details'), showGrammarDetailsAction);
bot.action('showPronounceDetails', ga4.view('show pronounce details'), showPronounceDetailsAction);

bot.action('finishAndFeedback', ga4.view('finish & feedback action'), finishAndFeedbackHears);

bot.action('canWeWriteYes', ga4.view('write me yes'), canWeWriteYesAction);
bot.action('canWeWriteNo', ga4.view('write me no'), canWeWriteNoAction);

bot.hears('🌐 Translate', ga4.view('translate'), translateHears);
bot.hears('✨ Improve', ga4.view('improve'), improveHears);
bot.hears('🔤 Show text', ga4.view('show text'), showTextHears);
bot.hears('🆘 Hint please', ga4.view('hint please'), hintPleaseHears);
bot.hears('🆕 New dialog', ga4.view('new dialog '), selectModeHears);
bot.hears('🔄 Select mode', ga4.view('select mode '), selectModeHears);
bot.hears('🏁 Finish & feedback', ga4.view('finish & feedback hears'), finishAndFeedbackHears);

bot.on(message('voice'), ga4.view('user voice message'), messageVoiceOn);
bot.on(message('text'), ga4.view('user text message'), messageTextOn);

bot.catch(async (err, ctx) => {
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
  await ctx.reply(ERROR_MESSAGE);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
