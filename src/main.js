import { Markup, Telegraf } from 'telegraf';
import RedisSession from 'telegraf-session-redis-upd';
import config from 'config';
import { message } from 'telegraf/filters';
import { ogg } from './ogg.js';
import { pronounce } from './pronounce.js';
import { openAi } from './openai.js';
import { textConverter } from './text.js';
import {
  diff,
  logAsyncFunctionTime,
  pronounceCorrect,
  getRandomIndexes,
  cutLongTermMemory,
  average,
} from './utils.js';
import TelegrafGA4 from 'telegraf-ga4';
import { topics } from './topics.js';

const ERROR_MESSAGE = 'Ooops. Please try again or /start.';

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

const ga4 = new TelegrafGA4({
  measurement_id: config.get('GA_MEASUREMENT_ID'),
  api_secret: config.get('GA_API_SECRET'),
  client_id: config.get('GA_API_CLIENT_ID'),
});

const session = new RedisSession({
  store: {
    host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
    port: process.env.TELEGRAM_SESSION_PORT || 6379,
  },
});

bot.use(session);
bot.use(ga4.middleware());

const settings = {
  grammarCheck: true,
  practiceLanguage: 'English',
  languageLevel: 'Intermediate',
  topics: [],
  selectedTopic: '',
};

const INITIAL_SESSION = {
  messages: [],
  settings,
  lastCheckMessage: {},
  diffText: '',
  pronounce: {},
  lastResponse: '',
  pronounseScores: [],
  grammarScores: [],
  averagePronunciationScore: 0,
  averageGrammarScore: 0,
};

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

const getTopic = async (ctx) => {
  try {
    const topicIndexes = getRandomIndexes(130, 3);
    if (ctx?.session?.settings?.topics) {
      ctx.session.settings.topics = [];
      for (const index of topicIndexes) {
        ctx.session.settings.topics.push(topics[index]);
      }
    }
    await ctx.reply(
      'What do you want to talk about? Select a topic:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            ctx.session.settings.topics[0],
            'selectTopic0Handler',
          ),
        ],
        [
          Markup.button.callback(
            ctx.session.settings.topics[1],
            'selectTopic1Handler',
          ),
        ],
        [
          Markup.button.callback(
            ctx.session.settings.topics[2],
            'selectTopic2Handler',
          ),
        ],
        [
          Markup.button.callback("✏️ Let's talk about...", 'myOwnTopicHandler'),
          Markup.button.callback('🔄 Change topics', 'changeTopics'),
        ],
      ]),
    );
  } catch (error) {
    console.error('getTopic: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};

const initialization = async (ctx) => {
  try {
    await ctx.reply(
      `Hi 👋, nice to meet you 😊. \nI will help you to practise and improve your English conversation skills.\nPlease send me a voice🎙 messages.`,
    );
    await setChatGptSettings(ctx);
    await getTopic(ctx);
  } catch (error) {
    console.error('initialization error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};

const selectTopic = async (ctx, index) => {
  try {
    ctx.sendChatAction('record_voice');
    ctx.session.settings.selectedTopic = ctx.session.settings.topics[index];
    ctx?.session?.settings?.selectedTopic &&
      ctx.editMessageText(
        `<b>Topic:</b> ${ctx.session.settings.selectedTopic}`,
        { parse_mode: 'HTML' },
      );
    ctx.session.messages.push({
      role: openAi.roles.USER,
      content: `Let's discuss: ${ctx.session.settings.selectedTopic}.`,
    });
    const response = await openAi.chat(ctx.session.messages);
    ctx.session.lastResponse = response.content;
    ctx.session.messages.push({
      role: openAi.roles.ASSISTANT,
      content: response.content,
    });
    const source = await textConverter.textToSpeech(
      response.content,
      ctx.session.settings.practiceLanguage,
    );
    await ctx.replyWithVoice(
      { source },
      Markup.keyboard([
        [
          Markup.button.callback(`🔤 Show text`, 'empty'),
          Markup.button.callback(`🆘 Hint please`, 'showGrammarDetails'),
        ],
        [
          Markup.button.callback(`🔄 Change topic`, 'changeTopics'),
          Markup.button.callback(`🏁 Finish & feedback`, 'showGrammarDetails'),
        ],
      ]).resize(),
    );
  } catch (error) {
    console.error('selectTopic: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};

bot.telegram.setMyCommands([{ command: '/start', description: 'Start' }]);

bot.command('start', ga4.view('start'), async (ctx) => {
  await initialization(ctx);
});

bot.action('changeTopics', ga4.view('topics change'), async (ctx) => {
  try {
    const topicIndexes = getRandomIndexes(109, 3);
    if (ctx?.session?.settings?.topics) {
      ctx.session.settings.topics = [];
      for (const index of topicIndexes) {
        ctx.session.settings.topics.push(topics[index]);
      }
    }
    await ctx.editMessageText(
      'What do you want to talk about?',
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            ctx.session.settings.topics[0],
            'selectTopic0Handler',
          ),
        ],
        [
          Markup.button.callback(
            ctx.session.settings.topics[1],
            'selectTopic1Handler',
          ),
        ],
        [
          Markup.button.callback(
            ctx.session.settings.topics[2],
            'selectTopic2Handler',
          ),
        ],
        [
          Markup.button.callback('✏️ My own topic', 'practiceLanguageGerman'),
          Markup.button.callback('🔄 Change topics', 'changeTopics'),
        ],
      ]),
    );
  } catch (error) {
    console.error('changeTopics: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
});

bot.action('selectTopic0Handler', ga4.view('topic selected'), async (ctx) => {
  try {
    await selectTopic(ctx, 0);
  } catch (error) {
    console.error('selectTopic0Handler: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
});

bot.action('selectTopic1Handler', ga4.view('topic selected'), async (ctx) => {
  try {
    await selectTopic(ctx, 1);
  } catch (error) {
    console.error('selectTopic1Handler: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
});

bot.action('selectTopic2Handler', ga4.view('topic selected'), async (ctx) => {
  try {
    await selectTopic(ctx, 2);
  } catch (error) {
    console.error('selectTopic2Handler: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
});

bot.action('myOwnTopicHandler', ga4.view('topic own'), async (ctx) => {
  try {
    await ctx.editMessageText('What do you want to talk about?');
  } catch (error) {
    console.error('myOwnTopic: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
});

bot.action('startNewLesson', ga4.view('start new lesson'), async (ctx) => {
  try {
    ctx.editMessageText(
      `<b>📊 Language level:</b> ${
        ctx.session.feedback.CEFR
      }\n<b>✏️ Grammar:</b> ${
        ctx.session.averageGrammarScore || '-'
      }%\n<b>🎙 Pronunciation:</b> ${
        ctx.session.averagePronunciationScore || '-'
      }%\n\n<b>👍 Already good:</b>\n${
        ctx.session.feedback.Good
      }\n\n<b>👉 Can be improved:</b>\n${
        ctx.session.feedback.Improve
      }\n\n<b>Grammar issues:</b>\n${ctx.session.feedback.Mistakes.map(
        (mistake) => `🔸 ${mistake}`,
      ).join('\n')}`,
      {
        ...Markup.inlineKeyboard([[]]),
        parse_mode: 'HTML',
      },
    );
    await setChatGptSettings(ctx);
    await getTopic(ctx);
  } catch (error) {
    console.error('myOwnTopic: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
});

bot.action(
  'showGrammarDetails',
  ga4.view('show grammar details'),
  async (ctx) => {
    try {
      ctx.editMessageText(`<b>Correct grammar:</b>\n${ctx.session.diffText}`, {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              `🎙 ${ctx.session.pronounce.pronounceScore}%`,
              'showPronounceDetails',
            ),
            Markup.button.callback(`✏️ ${ctx.session.grammarScore}%`, 'empty'),
          ],
        ]),
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('showGrammarDetails error: ', error.message);
      await ctx.reply(ERROR_MESSAGE);
    }
  },
);

bot.action(
  'showPronounceDetails',
  ga4.view('show grammar details'),
  async (ctx) => {
    try {
      ctx.editMessageText(
        `<b>Correct pronunciation:</b>\n${ctx.session.pronounceText}\n\nAccuracy: ${ctx.session.pronounce.accuracyScore}%  Fluency: ${ctx.session.pronounce.fluencyScore}%`,
        {
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                `🎙 ${ctx.session.pronounce.pronounceScore}%`,
                'empty',
              ),
              Markup.button.callback(
                `✏️ ${ctx.session.grammarScore}%`,
                'showGrammarDetails',
              ),
            ],
          ]),
          parse_mode: 'HTML',
        },
      );
    } catch (error) {
      console.error('showPronounceDetails error: ', error.message);
      await ctx.reply(ERROR_MESSAGE);
    }
  },
);

bot.hears('🔤 Show text', ga4.view('show text'), async (ctx) => {
  try {
    ctx.sendChatAction('typing');
    await ctx.reply(ctx.session.lastResponse);
  } catch (error) {
    console.error('Show text error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
});

bot.hears('🆘 Hint please', ga4.view('hint please'), async (ctx) => {
  try {
    ctx.sendChatAction('typing');
    const response =
      ctx?.session?.lastResponse &&
      (await logAsyncFunctionTime(
        () =>
          openAi.chat(
            {
              messages: [
                {
                  role: openAi.roles.SYSTEM,
                  content: `Give three answers to this question, each in one short and simple sentence in English. Use a bullet list.`,
                },
                { role: openAi.roles.USER, content: ctx.session.lastResponse },
              ],
            }.messages,
          ),
        'openAi - hint',
      ));
    await ctx.replyWithHTML(`<b>You can say:</b>\n${response.content}`);
  } catch (error) {
    console.log('Hint error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
});

bot.hears('🔄 Change topic', ga4.view('change topic'), async (ctx) => {
  try {
    // await setChatGptSettings(ctx);
    await getTopic(ctx);
  } catch (error) {
    console.error('Change topic error:', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
});

bot.hears(
  '🏁 Finish & feedback',
  ga4.view('finish & feedback'),
  async (ctx) => {
    try {
      let userText = '';
      for (const message of ctx.session.messages) {
        if (message.role === openAi.roles.USER) {
          userText += ` ${message.content}`;
        }
      }
      if (userText.length > 300) {
        const response = await logAsyncFunctionTime(
          () =>
            openAi.chat(
              {
                messages: [
                  {
                    role: openAi.roles.USER,
                    content: `My speech: "${userText}".
                    JSON fields:
                    "CEFR" : Cefr level of my speech,
                    "Good":  I need an advice two sentences about current grammar and vocabulary in my speech. Format string,
                    "Improve": I need an advice two sentences about what can be improved in grammar and vocabulary in my speech. Format string,
                    "Mistakes":  Write why my grammar is being corrected, no more than three grammar errors. Format an array of strings, one string per mistake.
                    `,
                  },
                ],
              }.messages,
              'gpt-4-1106-preview',
              // 'gpt-3.5-turbo-1106',
              'json_object',
            ),
          'openAi - feedback',
        );
        ctx.session.feedback = JSON.parse(response.content);
        ctx.session.averagePronunciationScore = average(
          ctx.session.pronounseScores,
        );
        ctx.session.averageGrammarScore = average(ctx.session.grammarScores);
        await ctx.replyWithHTML(
          `<b>📊 Language level:</b> ${
            ctx.session.feedback.CEFR
          }\n<b>✏️ Grammar:</b> ${
            ctx.session.averageGrammarScore || '-'
          }%\n<b>🎙 Pronunciation:</b> ${
            ctx.session.averagePronunciationScore || '-'
          }%\n\n<b>👍 Already good:</b>\n${
            ctx.session.feedback.Good
          }\n\n<b>👉 Can be improved:</b>\n${
            ctx.session.feedback.Improve
          }\n\n<b>Grammar issues:</b>\n${ctx.session.feedback.Mistakes.map(
            (mistake) => `🔸 ${mistake}`,
          ).join('\n')}`,
          Markup.inlineKeyboard([
            [Markup.button.callback(`🌟 Start new lesson`, 'startNewLesson')],
          ]).resize(),
        );
      } else {
        await ctx.reply("Let's talk a little bit more 😊.");
      }
    } catch (error) {
      console.error('finish & feedback error:', error.message);
      await ctx.reply(ERROR_MESSAGE);
    }
  },
);

bot.on(message('voice'), ga4.view('user voice message'), async (ctx) => {
  let globalResponse;
  try {
    ctx.sendChatAction('typing');
    if (!ctx.session.settings) {
      return initialization(ctx);
    }
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = ctx?.message?.from?.id;
    const oggPath = await ogg.create(link.href, userId);
    const [mp3Path, wavPath] = await Promise.all([
      ogg.toMp3(oggPath, userId),
      ogg.toWav(oggPath, userId),
    ]);
    let text = await logAsyncFunctionTime(
      () =>
        openAi.transcription(mp3Path, ctx.session.settings.practiceLanguage),
      'openAi - transcript audio',
    );
    text = /[A-Za-z]$/.test(text) ? text + '.' : text;
    ctx.session.messages = cutLongTermMemory(ctx.session.messages, 21, 2);
    ctx.session.messages.push({ role: openAi.roles.USER, content: text });
    ctx.sendChatAction('typing');
    const [
      {
        pronounceScore,
        pronounceText,
        pronounceWords,
        accuracyScore,
        fluencyScore,
      },
      grammar,
      response,
    ] = await Promise.all([
      logAsyncFunctionTime(
        () => pronounce.getPronunciationAssessment(wavPath, text),
        'microsoft - pronounce assasment',
      ),
      logAsyncFunctionTime(
        () =>
          openAi.chat(
            {
              messages: [
                {
                  role: openAi.roles.SYSTEM,
                  content: `It is English. Correct my spelling and grammar. Return text in quotes. Text: "${text}"`,
                },
              ],
            }.messages,
          ),
        'openAi - check grammar',
      ),
      logAsyncFunctionTime(
        () => openAi.chat(ctx.session.messages),
        'openAi - make answer',
      ),
    ]);
    globalResponse = response;
    ctx.sendChatAction('typing');
    const corrected =
      grammar?.content?.match(/.*"([^"]+)"/)[0].slice(1, -1) || '';
    const { diffText, grammarScore } = await diff(text, corrected);
    ctx.session.diffText = diffText || '';
    ctx.session.grammarScore = grammarScore || '-';
    ctx.session.grammarScores.push(Number(grammarScore) || 0);
    ctx.session.pronounce = {
      pronounceScore: pronounceScore || '-',
      accuracyScore: accuracyScore || '-',
      fluencyScore: fluencyScore || '-',
    };
    ctx.session.pronounseScores.push(Number(pronounceScore) || 0);
    ctx.session.pronounceText = await pronounceCorrect(
      pronounceText,
      pronounceWords,
    );
    ctx.sendChatAction('typing');
    ctx.session?.lastCheckMessage?.message_id &&
      (await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.session.lastCheckMessage.message_id,
        0,
        ctx.session.lastCheckMessage.text,
        { entities: ctx.session.lastCheckMessage.entities },
      ));
    ctx.session.lastCheckMessage = {};
    ctx.session.lastCheckMessage = await ctx.replyWithHTML(
      `<b>Your message:</b>\n${text}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            `🎙 ${ctx.session?.pronounce?.pronounceScore || '-'}%`,
            'showPronounceDetails',
          ),
          Markup.button.callback(
            `✏️ ${ctx.session?.grammarScore || '-'}%`,
            'showGrammarDetails',
          ),
        ],
      ]).resize(),
    );
  } catch (error) {
    console.error('check user message error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }

  try {
    ctx.sendChatAction('record_voice');
    ctx.session.messages.push({
      role: openAi.roles.ASSISTANT,
      content: globalResponse.content,
    });
    const source = await logAsyncFunctionTime(
      () =>
        textConverter.textToSpeech(
          `${globalResponse.content || ''}`,
          ctx.session.settings.practiceLanguage,
        ),
      'openAi - text to speech',
    );
    ctx.session.lastResponse = globalResponse.content;
    await ctx.replyWithVoice({ source });
    console.log(
      '=============================================================================',
    );
  } catch (error) {
    console.error('make audio error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
});

bot.on(message('text'), ga4.view('user text message'), async (ctx, next) => {
  try {
    if (!ctx.session.settings) {
      return initialization(ctx);
    }
    // ctx.sendChatAction('record_voice');
    // const { grammarCheck } = ctx.session.settings;
    // const grammar = grammarCheck ? await openAi.chat({
    //   messages: [
    //     { role: openAi.roles.SYSTEM, content: `It is ${ctx.session.settings.practiceLanguage}. Correct my spelling and grammar. Return text in quotes. Text: "${ctx.message.text}"` }]
    // }.messages) : null;
    // const corrected = grammar.content.match(/.*"([^"]+)"/)[0].slice(1, -1);
    // const diffText = await diff(ctx.message.text, corrected)
    // grammarCheck && corrected.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"") !== ctx.message.text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"") ? await ctx.replyWithHTML(`Correct: ${diffText}`) : null;
    // ctx.session.messages = cutLongTermMemory(ctx.session.messages, 11, 2);
    // ctx.session.messages.push({ role: openAi.roles.USER, content: ctx.message.text })
    // const response = await openAi.chat(ctx.session.messages);
    // ctx.session.messages.push({ role: openAi.roles.ASSISTANT, content: response.content })
    // const source = await textConverter.textToSpeech(response.content, ctx.session.settings.practiceLanguage)
    // await ctx.replyWithVoice({ source }, { caption: response.content })
    await ctx.reply('Please send a voice 🎙 message');
  } catch (error) {
    console.error('get text: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
});

bot.catch((err, ctx) => {
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
