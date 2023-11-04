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
} from './utils.js';
import TelegrafGA4 from 'telegraf-ga4';
import { topics } from './topics.js';

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
  practiceLanguage: 'British English',
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
};

const setChatGptSettings = async (ctx) => {
  try {
    const level = ctx.session.settings.languageLevel || settings.languageLevel;
    const language =
      ctx.session.settings.practiceLanguage || settings.practiceLanguage;
    ctx.session.messages.push({
      role: openAi.roles.SYSTEM,
      content: `Act as ${language} language teacher. Let's practice some dialogues. Answer in ${level} ${language} language, with maximum 2 sentences. Ask question at the end.`,
    });
  } catch (error) {
    console.error('setChatGptSettings: ', error.message);
  }
};

const cutLongTermMemory = (data = [], length, startFrom) => {
  const dataLength = data.length;
  if (dataLength > length - startFrom) {
    return [
      ...data.slice(0, startFrom),
      ...data.slice((length - startFrom) * -1),
    ];
  }
  return data;
};

const getTopic = async (ctx) => {
  try {
    const topicIndexes = getRandomIndexes(109, 3);
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
  }
};

const initialization = async (ctx) => {
  try {
    ctx.session = structuredClone(INITIAL_SESSION);
    await ctx.reply(
      `Hi 👋, nice to meet you. \nI will help you practice your English conversation skills.\nYou can send voice 🎙 or text 💬 messages.`,
    );
    await ctx.reply(
      'What English do you want to practice?',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('🇬🇧 British', 'practiceBritishEnglish'),
          Markup.button.callback('🇺🇸 American', 'practiceAmericanEnglish'),
        ],
      ]),
    );
  } catch (error) {
    console.error('initialization error: ', error.message);
  }
};

const selectTopic = async (ctx, index) => {
  try {
    ctx.session.settings.selectedTopic = ctx.session.settings.topics[index];
    ctx?.session?.settings?.selectedTopic &&
      ctx.editMessageText(ctx.session.settings.selectedTopic);
    ctx.session.messages.push({
      role: openAi.roles.USER,
      content: `Let's discuss: ${ctx.session.settings.selectedTopic}`,
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
    await ctx.replyWithVoice({ source });
  } catch (error) {
    console.error('selectTopic: ', error.message);
  }
};

bot.telegram.setMyCommands([
  { command: '/start', description: 'Start' },
  // { command: '/buy', description: 'Test buy' },
]);

bot.command('start', ga4.view('start'), async (ctx) => {
  await initialization(ctx);
});

const getInvoice = (id) => {
  const invoice = {
    chat_id: id, // Unique identifier of the target chat or username of the target channel
    provider_token: config.get('STRIPE_PAYMENTS_TOKEN'), // token issued via bot @SberbankPaymentBot
    start_parameter: 'get_access', // Unique parameter for deep links. If you leave this field blank, forwarded copies of the forwarded message will have a Pay button that allows multiple users to pay directly from the forwarded message using the same account. If not empty, redirected copies of the sent message will have a URL button with a deep link to the bot (instead of a payment button) with a value used as an initial parameter.
    title: 'InvoiceTitle', // Product name, 1-32 characters
    description: 'InvoiceDescription', // Product description, 1-255 characters
    currency: 'PLN', // ISO 4217 Three-Letter Currency Code
    prices: [{ label: 'Invoice Title', amount: 5 * 100 }], // Price breakdown, serialized list of components in JSON format 100 kopecks * 100 = 100 rubles
    payload: 'payload',
  };

  return invoice;
};

bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true)); // response to a preliminary request for payment

bot.on('successful_payment', async (ctx, next) => {
  // reply in case of positive payment
  await ctx.reply('SuccessfulPayment');
});

bot.command('buy', async (ctx) => {
  try {
    await ctx.replyWithHTML(
      "Cards for test pay <a href='https://stripe.com/docs/testing#cards'>here</a>",
      { disable_web_page_preview: true },
    );
    await ctx.replyWithInvoice(getInvoice(ctx.from.id));
  } catch (error) {
    console.error('buy command: ', error.message);
  }
});

bot.command('check', async (ctx) => {
  try {
    ctx.session.settings.grammarCheck = !ctx.session.settings.grammarCheck;
    ctx.session.settings.grammarCheck
      ? await ctx.reply('Grammar check activated')
      : await ctx.reply('Grammar check disabled');
  } catch (error) {
    console.error('check command: ', error.message);
  }
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
  }
});

bot.action('selectTopic0Handler', ga4.view('topic selected'), async (ctx) => {
  try {
    await selectTopic(ctx, 0);
  } catch (error) {
    console.error('selectTopic0Handler: ', error.message);
  }
});

bot.action('selectTopic1Handler', ga4.view('topic selected'), async (ctx) => {
  try {
    await selectTopic(ctx, 1);
  } catch (error) {
    console.error('selectTopic1Handler: ', error.message);
  }
});

bot.action('selectTopic2Handler', ga4.view('topic selected'), async (ctx) => {
  try {
    await selectTopic(ctx, 2);
  } catch (error) {
    console.error('selectTopic2Handler: ', error.message);
  }
});

bot.action('myOwnTopicHandler', ga4.view('topic own'), async (ctx) => {
  try {
    await ctx.editMessageText('What do you want to talk about?');
  } catch (error) {
    console.error('myOwnTopic: ', error.message);
  }
});

bot.action(
  'practiceAmericanEnglish',
  ga4.view('american english'),
  async (ctx) => {
    try {
      ctx.session.settings.practiceLanguage = 'american';
      await ctx.editMessageText('🇺🇸 American selected');
      await setChatGptSettings(ctx);
      await getTopic(ctx);
    } catch (error) {
      console.error('practiceAmericanEnglish: ', error.message);
    }
  },
);

bot.action(
  'practiceBritishEnglish',
  ga4.view('britishEnglish'),
  async (ctx) => {
    try {
      ctx.session.settings.practiceLanguage = 'british';
      await ctx.editMessageText('🇬🇧 British English selected');
      await setChatGptSettings(ctx);
      await getTopic(ctx);
    } catch (error) {
      console.error('practiceBritishEnglish: ', error.message);
    }
  },
);

bot.action(
  'showGrammarDetails',
  ga4.view('show grammar details'),
  async (ctx) => {
    try {
      ctx.editMessageText(`<b>Correct grammar:</b>\n${ctx.session.diffText}`, {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              `👄 ${ctx.session.pronounce.pronounceScore}%`,
              'showPronounceDetails',
            ),
            Markup.button.callback(`✏️ ${ctx.session.grammarScore}%`, 'empty'),
          ],
        ]),
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('practiceAmericanEnglish: ', error.message);
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
                `👄 ${ctx.session.pronounce.pronounceScore}%`,
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
      console.error('practiceAmericanEnglish: ', error.message);
    }
  },
);

bot.hears('🔤 Show text', ga4.view('show text'), async (ctx) => {
  ctx.sendChatAction('typing');
  ctx?.session?.lastResponse
    ? await ctx.reply(ctx.session.lastResponse)
    : ctx.reply('No text yet...');
});

bot.hears('🆘 Hint please', ga4.view('hint please'), async (ctx) => {
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
                content: `Give 3 answers to this question, each in one short and simple sentence in basic level English. Use bullet list.`,
              },
              { role: openAi.roles.USER, content: ctx.session.lastResponse },
            ],
          }.messages,
        ),
      'openAi - hint',
    ));
  response?.content
    ? await ctx.replyWithHTML(`<b>You can say:</b>\n${response.content}`)
    : await ctx.reply('We have some issues. Please try again.');
});

bot.hears('🔄 Change topic', ga4.view('change topic'), async (ctx) => {
  try {
    ctx.session = {
      ...structuredClone(INITIAL_SESSION),
      settings: ctx?.session?.settings || settings,
    };
    await setChatGptSettings(ctx);
    await getTopic(ctx);
  } catch (error) {
    console.error('new command: ', error.message);
  }
});

bot.hears(
  '🏁 Finish & feedback',
  ga4.view('finish & feedback'),
  async (ctx) => {
    ctx.reply('Some feedback');
  },
);

bot.on(message('voice'), ga4.view('user voice message'), async (ctx) => {
  try {
    ctx.sendChatAction('typing');
    if (!ctx.session.settings) {
      return initialization(ctx);
    }
    const link =
      ctx?.message?.voice?.file_id &&
      (await ctx.telegram.getFileLink(ctx.message.voice.file_id));
    const userId = ctx?.message?.from?.id && ctx.message.from.id;
    const oggPath =
      link?.href && userId && (await ogg.create(link.href, userId));
    const [mp3Path, wavPath] =
      oggPath &&
      userId &&
      (await Promise.all([
        ogg.toMp3(oggPath, userId),
        ogg.toWav(oggPath, userId),
      ]));
    let text =
      mp3Path &&
      ctx?.session?.settings?.practiceLanguage &&
      (await logAsyncFunctionTime(
        () =>
          openAi.transcription(mp3Path, ctx.session.settings.practiceLanguage),
        'openAi - transcript audio',
      ));
    text = /[A-Za-z]$/.test(text) ? text + '.' : text;
    ctx.session.messages = cutLongTermMemory(ctx.session.messages, 11, 2);
    ctx.session.messages.push({ role: openAi.roles.USER, content: text });
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
                  content: `It is ${ctx.session.settings.practiceLanguage}. Correct my spelling and grammar. Return text in quotes. Text: "${text}"`,
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
    ctx.sendChatAction('typing');
    const corrected =
      grammar?.content?.match(/.*"([^"]+)"/)[0].slice(1, -1) || '';
    const { diffText, grammarScore } = await diff(text, corrected);
    ctx.session.diffText = diffText || '';
    ctx.session.grammarScore = grammarScore || '-';
    ctx.session.pronounce = {
      pronounceScore: pronounceScore || '-',
      accuracyScore: accuracyScore || '-',
      fluencyScore: fluencyScore || '-',
    };
    ctx.session.pronounceText = await pronounceCorrect(
      pronounceText,
      pronounceWords,
    );
    ctx.session?.lastCheckMessage?.message_id &&
      (await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.session.lastCheckMessage.message_id,
        0,
        ctx.session.lastCheckMessage.text,
        { entities: ctx.session.lastCheckMessage.entities },
      ));
    ctx.session.lastCheckMessage = {};
    // ctx.sendChatAction('typing');
    ctx.session.lastCheckMessage = await ctx.replyWithHTML(
      `<b>Your message:</b>\n${
        text || 'Something bad happened, send the message again please.'
      }`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            `👄 ${ctx.session?.pronounce?.pronounceScore || '-'}%`,
            'showPronounceDetails',
          ),
          Markup.button.callback(
            `✏️ ${ctx.session?.grammarScore || '-'}%`,
            'showGrammarDetails',
          ),
        ],
      ]).resize(),
    );
    ctx.sendChatAction('record_voice');
    ctx.session.messages.push({
      role: openAi.roles.ASSISTANT,
      content: response.content,
    });
    const source =
      response?.content &&
      (await logAsyncFunctionTime(
        () =>
          textConverter.textToSpeech(
            `${response.content || ''}`,
            ctx.session.settings.practiceLanguage,
          ),
        'google - text to speech',
      ));
    ctx.session.lastResponse = response?.content || '';
    source &&
      (await ctx.replyWithVoice(
        { source },
        Markup.keyboard([
          [
            Markup.button.callback(`🔤 Show text`, 'empty'),
            Markup.button.callback(`🆘 Hint please`, 'showGrammarDetails'),
          ],
          [
            Markup.button.callback(`🔄 Change topic`, 'changeTopics'),
            Markup.button.callback(
              `🏁 Finish & feedback`,
              'showGrammarDetails',
            ),
          ],
        ]).resize(),
      ));
    console.log(
      '=============================================================================',
    );
  } catch (error) {
    console.error('get voice: ', error.message);
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
    await ctx.reply('Please record audio, text message is temporarily off');
  } catch (error) {
    console.error('get text: ', error.message);
  }
});

bot.catch((err, ctx) => {
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
