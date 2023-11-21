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
import showTextHears from './hears/showTextHears.js';
import hintPleaseHears from './hears/hintPleaseHears.js';
import changeTopicHears from './hears/changeTopicHears.js';
import finishAndFeedbackHears from './hears/finishAndFeedbackHears.js';
import messageVoiceOn from './on/messageVoiceOn.js';
import messageTextOn from './on/messageTextOn.js';
import startNewLessonAction from './actions/startNewLessonAction.js';
import canWeWriteYesAction from './actions/canWeWriteYesAction.js';
import canWeWriteNoAction from './actions/canWeWriteNoAction.js';

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

bot.use(session);
bot.use(ga4.middleware());

bot.telegram.setMyCommands([{ command: '/start', description: 'Start' }]);

bot.command('start', ga4.view('start'), startAction);

bot.action('changeTopics', ga4.view('topics change'), changeTopicsAction);
bot.action('selectTopic0', ga4.view('topic selected'), selectTopic0Action);
bot.action('selectTopic1', ga4.view('topic selected'), selectTopic1Action);
bot.action('selectTopic2', ga4.view('topic selected'), selectTopic2Action);
bot.action('selectMyOwnTopic', ga4.view('my own topic'), selectMyOwnTopicAction);

bot.action('startNewLesson', ga4.view('start new lesson'), startNewLessonAction);

bot.action('showGrammarDetails', ga4.view('show grammar details'), showGrammarDetailsAction);
bot.action('showPronounceDetails', ga4.view('show pronounce details'), showPronounceDetailsAction);

bot.action('canWeWriteYes', ga4.view('write me yes'), canWeWriteYesAction);
bot.action('canWeWriteNo', ga4.view('write me no'), canWeWriteNoAction);

bot.hears('🔤 Show text', ga4.view('show text'), showTextHears);
bot.hears('🆘 Hint please', ga4.view('hint please'), hintPleaseHears);
bot.hears('🔄 Change topic', ga4.view('change topic'), changeTopicHears);
bot.hears('🏁 Finish & feedback', ga4.view('finish & feedback'), finishAndFeedbackHears);

bot.on(message('voice'), ga4.view('user voice message'), messageVoiceOn);
bot.on(message('text'), ga4.view('user text message'), messageTextOn);

bot.catch(async (err, ctx) => {
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
  await ctx.reply(ERROR_MESSAGE);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
