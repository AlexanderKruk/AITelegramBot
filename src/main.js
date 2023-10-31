import { Markup, Telegraf } from 'telegraf';
import RedisSession from 'telegraf-session-redis-upd'
import config from 'config';
import { message } from 'telegraf/filters'
import { ogg } from './ogg.js';
import { pronounce } from './pronounce.js';
import { openAi } from './openai.js'
import { textConverter } from './text.js';
import { spoiler } from 'telegraf/format'
import { diff } from './utils.js';
import TelegrafGA4 from 'telegraf-ga4';

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

const ga4 = new TelegrafGA4({
  measurement_id: config.get("GA_MEASUREMENT_ID"),
  api_secret: config.get("GA_API_SECRET"),
  client_id: config.get("GA_API_CLIENT_ID")
});

const session = new RedisSession({
  store: {
    host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
    port: process.env.TELEGRAM_SESSION_PORT || 6379
  }
})

bot.use(session)
bot.use(ga4.middleware());

const settings = {
  hideQuestion: false,
  grammarCheck: true,
  practiceLanguage: 'English',
  languageLevel: 'basic',
  topics: [],
  selectedTopic: "",
}

const INITIAL_SESSION = {
  messages: [],
  topicMessages: [],
  settings,
  lastCheckMessage: {},
}

const selectLanguageLevel = async (ctx) => {
  try {
    await ctx.reply("Select your language level", Markup.inlineKeyboard([
      [Markup.button.callback("🙋 Basic", "languageLevelBeginner")],
      [Markup.button.callback("🧑‍🏫️ Intermediate", "languageLevelIntermediate")],
      [Markup.button.callback("🧑‍🎓️ Advanced", "languageLevelAdvanced")]
    ]))
  } catch (error) {
    console.error('selectLanguageLevel: ', error.message) 
  }
}

const setChatGptSettings = async (ctx) => {
  try {
    const level = ctx.session.settings.languageLevel || settings.languageLevel
    const language = ctx.session.settings.practiceLanguage || settings.practiceLanguage
    ctx.session.messages.push({
      role: openAi.roles.SYSTEM, content: `Act as ${language} language teacher. Let's practice some dialogues. Answer in ${level} ${language} language, with maximum 2 sentences. Ask question at the end.`
    })
    ctx.session.topicMessages.push({
      role: openAi.roles.SYSTEM, content: `Answer only in ${language} language. Suggest numbered list of 3 topics for discuss at the ${level} level. Only titles. Maximum 44 characters each topic. No need to write amount of symbols`
    })
  } catch (error) {
    console.error('setChatGptSettings: ', error.message)
  }
}

const cutLongTermMemory = (data = [], length, startFrom) => {
  const dataLength = data.length;
  if (dataLength > length - startFrom) {
    return [...data.slice(0,startFrom), ...data.slice((length - startFrom) * -1)]
  }
  return data;
}

const getTopic = async (ctx) => {
  try {
    const rawTopics = await openAi.chat(ctx.session.topicMessages);
    ctx.session.topicMessages.push({ role: openAi.roles.ASSISTANT, content: rawTopics.content })
    ctx.session.settings.topics = rawTopics.content.split('\n').map(item => item.slice(3).replace(/['"]+/g, ''));
    await ctx.reply("What do you want to talk about? Select a topic:", Markup.inlineKeyboard([
      [Markup.button.callback(ctx.session.settings.topics[0], "selectTopic0Handler")],
      [Markup.button.callback(ctx.session.settings.topics[1], "selectTopic1Handler")],
      [Markup.button.callback(ctx.session.settings.topics[2], "selectTopic2Handler")],
      [Markup.button.callback("✏️ Let's talk about...", "myOwnTopicHandler"), Markup.button.callback("🔄 Change topics", "changeTopics"),],
    ]))
  } catch (error) {
    console.error('getTopic: ', error.message)
  }
}

const initialization = async (ctx) => {
  try {
    ctx.session = structuredClone(INITIAL_SESSION)
    await ctx.reply(`Hi 👋, nice to meet you. \nI will help you practice your English conversation skills.\nYou can send voice 🎙 or text 💬 messages.`)
    await ctx.reply("What English do you want to practice?", Markup.inlineKeyboard([
      [Markup.button.callback("🇬🇧 British", "practiceBritishEnglish"),
        Markup.button.callback("🇺🇸 American", "practiceAmericanEnglish")],
      // [Markup.button.callback("Polish", "practiceLanguagePolish")]
    ]))
  } catch (error) {
    console.error('initialization error: ', error.message)
  }
}

const selectTopic = async (ctx, index) => {
  try {
    ctx.session.settings.selectedTopic = ctx.session.settings.topics[index]
    ctx.editMessageText('🎯 ' + ctx.session.settings.selectedTopic)
    ctx.session.messages.push({ role: openAi.roles.USER, content: `Let's discuss: ${ctx.session.settings.selectedTopic}` })
    const response = await openAi.chat(ctx.session.messages);
    ctx.session.messages.push({ role: openAi.roles.ASSISTANT, content: response.content })
    const source = await textConverter.textToSpeech(response.content, ctx.session.settings.practiceLanguage)
    await ctx.replyWithVoice({ source }, { caption: ctx.session.settings.hideQuestion ? spoiler(response.content) : response.content})
  } catch (error) {
    console.error('selectTopic: ', error.message)
  }
}

bot.telegram.setMyCommands([
  { command: '/start', description: 'Choose English variant and level' },
  { command: '/topic', description: 'Change topic' },
  { command: '/pronounce', description: 'Check pronounce' },
  // { command: '/spoilers', description: 'Hide or show text answers' },
  // { command: '/buy', description: 'Test buy' },
  // { command: '/check', description: 'Grammar check'},
])

bot.command('start', ga4.view('start'), async (ctx) => {
  await initialization(ctx)
})

const getInvoice = (id) => {
  const invoice = {
    chat_id: id, // Unique identifier of the target chat or username of the target channel
    provider_token: config.get('STRIPE_PAYMENTS_TOKEN'), // token issued via bot @SberbankPaymentBot
    start_parameter: 'get_access', // Unique parameter for deep links. If you leave this field blank, forwarded copies of the forwarded message will have a Pay button that allows multiple users to pay directly from the forwarded message using the same account. If not empty, redirected copies of the sent message will have a URL button with a deep link to the bot (instead of a payment button) with a value used as an initial parameter.
    title: 'InvoiceTitle', // Product name, 1-32 characters
    description: 'InvoiceDescription', // Product description, 1-255 characters
    currency: 'PLN', // ISO 4217 Three-Letter Currency Code
    prices: [{ label: 'Invoice Title', amount: 5 * 100 }], // Price breakdown, serialized list of components in JSON format 100 kopecks * 100 = 100 rubles
    payload: "payload"
  }

  return invoice
}

bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true)) // response to a preliminary request for payment

bot.on('successful_payment', async (ctx, next) => { // reply in case of positive payment
  await ctx.reply('SuccessfulPayment')
})


bot.command('buy', async (ctx) => {
  try {
    await ctx.replyWithHTML("Cards for test pay <a href='https://stripe.com/docs/testing#cards'>here</a>",
      { disable_web_page_preview: true });
    await ctx.replyWithInvoice(getInvoice(ctx.from.id))
  } catch (error) {
    console.error('buy command: ', error.message)
  }
})

bot.command('pronounce', async (ctx) => {
  try {
    const result = await pronounce.getPronunciationAssessment()
  } catch (error) {
    console.error('pronounce: ', error.message)
  }
})

bot.command('topic', ga4.view('new dialog'), async (ctx) => {
  try {
    ctx.session = {
      ...structuredClone(INITIAL_SESSION),
      settings: ctx?.session?.settings || settings,
      topicMessages: ctx?.session?.topicMessages || []
    }
    await setChatGptSettings(ctx)
    await getTopic(ctx)
  } catch (error) {
    console.error('new command: ', error.message)
  }
})

bot.command('spoilers', ga4.view('toggle spoilers'), async (ctx) => {
  try {
    ctx.session.settings.hideQuestion = !ctx.session.settings.hideQuestion;
    ctx.session.settings.hideQuestion ? await ctx.reply('Spoiler activated') : await ctx.reply('Spoiler disabled');
  } catch (error) {
    console.error('spoilers command: ', error.message)
  }
})

bot.command('check', async (ctx) => {
  try {
    ctx.session.settings.grammarCheck = !ctx.session.settings.grammarCheck;
    ctx.session.settings.grammarCheck ? await ctx.reply('Grammar check activated') : await ctx.reply('Grammar check disabled');
  } catch (error) {
    console.error('check command: ', error.message)
  }
})

bot.action("changeTopics", ga4.view('topics change'), async (ctx) => {
  try {
    ctx.session.topicMessages = cutLongTermMemory(ctx.session.topicMessages, 11, 1);
    ctx.session.topicMessages.push({ role: openAi.roles.USER, content: `Update topics` })
    const rawTopics = await openAi.chat(ctx.session.topicMessages);
    ctx.session.topicMessages.push({ role: openAi.roles.ASSISTANT, content: rawTopics.content })
    ctx.session.settings.topics = rawTopics.content.split('\n').map(item => item.replace(/['"]+/g, ''));
    await ctx.editMessageText("What do you want to talk about? Select a topic:", Markup.inlineKeyboard([
      [Markup.button.callback(ctx.session.settings.topics[0], "selectTopic0Handler")],
      [Markup.button.callback(ctx.session.settings.topics[1], "selectTopic1Handler")],
      [Markup.button.callback(ctx.session.settings.topics[2], "selectTopic2Handler")],
      [Markup.button.callback("✏️ My own topic", "practiceLanguageGerman"), Markup.button.callback("🔄 Change topics", "changeTopics"),],
    ]))
  } catch (error) {
    console.error('changeTopics: ', error.message) 
  }
})

bot.action("selectTopic0Handler", ga4.view('topic selected'), async (ctx) => {
  try {
    await selectTopic(ctx, 0);
  } catch (error) {
    console.error('selectTopic0Handler: ', error.message); 
  }
})


bot.action("selectTopic1Handler", ga4.view('topic selected'), async (ctx) => {
  try {
    await selectTopic(ctx, 1);
  } catch (error) {
    console.error('selectTopic1Handler: ', error.message); 
  }
})


bot.action("selectTopic2Handler", ga4.view('topic selected'), async (ctx) => {
  try {
    await selectTopic(ctx, 2);
  } catch (error) {
    console.error('selectTopic2Handler: ', error.message); 
  }
})

bot.action("myOwnTopicHandler", ga4.view('topic own'), async (ctx) => {
  try {
    await ctx.editMessageText("What do you want to talk about?");
  } catch (error) {
    console.error('myOwnTopic: ', error.message); 
  }
})


bot.action("practiceAmericanEnglish", ga4.view('american english'), async (ctx) => {
  try {
    ctx.session.settings.practiceLanguage = "americanEnglish";
    await ctx.editMessageText("🇺🇸 American selected")
    await selectLanguageLevel(ctx);
  } catch (error) {
    console.error('practiceAmericanEnglish: ', error.message);
  }
})

bot.action("practiceBritishEnglish", ga4.view('britishEnglish'), async (ctx) => {
  try {
    ctx.session.settings.practiceLanguage = "britishEnglish";
    await ctx.editMessageText("🇬🇧 British English selected")
    await selectLanguageLevel(ctx);
  } catch (error) {
    console.error('practiceBritishEnglish: ', error.message);
  }
})

// bot.action("practiceLanguagePolish", ga4.view('language polish'), async (ctx) => {
//   try {
//     ctx.session.settings.practiceLanguage = "Polish";
//     await ctx.editMessageText("Polish selected")
//     await selectLanguageLevel(ctx);
//   } catch (error) {
//     console.error('practiceLanguagePolish: ', error.message);
//   }
// })

bot.action("languageLevelBeginner", ga4.view('level beginner'), async (ctx) => {
  try {
    ctx.session.settings.languageLevel = "basic";
    await setChatGptSettings(ctx);
    await ctx.editMessageText("🙋 Basic level selected")
    await getTopic(ctx);
  } catch (error) {
    console.error('languageLevelBeginner: ', error.message);
  }
})

bot.action("languageLevelIntermediate", ga4.view('level intermediate'), async (ctx) => {
  try {
    ctx.session.settings.languageLevel = "intermediate";
    await setChatGptSettings(ctx);
    await ctx.editMessageText("🧑‍🏫️ Intermediate level selected");
    await getTopic(ctx);
  } catch (error) {
    console.error('languageLevelIntermediate: ', error.message);
  }
})

bot.action("languageLevelAdvanced", ga4.view('level advanced'), async (ctx) => {
  try {
    ctx.session.settings.languageLevel = "advanced";
    await setChatGptSettings(ctx);
    await ctx.editMessageText("🧑‍🎓️ Advanced level selected");
    await getTopic(ctx);
  } catch (error) {
    console.error('languageLevelAdvanced: ', error.message);
  }
})

bot.on(message('voice'), ga4.view('user voice message'), async (ctx) => {
  try {
    if (!ctx.session.settings) {
      return initialization(ctx);
    }
    ctx.sendChatAction('record_voice');
    const { grammarCheck } = ctx.session.settings;
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = ctx.message.from.id;
    const oggPath = await ogg.create(link.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);
    const wavPath = await ogg.toWav(oggPath, userId);
    const text = await openAi.transcription(mp3Path, ctx.session.settings.practiceLanguage);
    const pronaunceScore = await pronounce.getPronunciationAssessment(wavPath, text)
    const grammar = grammarCheck ? await openAi.chat({
      messages: [
        { role: openAi.roles.SYSTEM, content: `It is ${ctx.session.settings.practiceLanguage}. Correct my spelling and grammar. Return text in quotes. Text: "${text}"` }]
    }.messages) : null;
    const corrected = grammar.content.match(/.*"([^"]+)"/)[0].slice(1, -1);
    const diffText = await diff(text, corrected)
    grammarCheck && corrected !== text ? await ctx.replyWithHTML(`Correct: ${diffText}`) : null;
    ctx.session.messages = cutLongTermMemory(ctx.session.messages, 11, 2);
    ctx.session.messages.push({ role: openAi.roles.USER, content: text })
    const response = await openAi.chat(ctx.session.messages);
    ctx.session.messages.push({ role: openAi.roles.ASSISTANT, content: response.content })
    const source = await textConverter.textToSpeech(`${response.content}`, ctx.session.settings.practiceLanguage)
    ctx.session.lastCheckMessage?.message_id && await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.lastCheckMessage.message_id, 0, ctx.session.lastCheckMessage.text)
    ctx.session.lastCheckMessage = await ctx.replyWithHTML(`${text}`,   Markup.inlineKeyboard([
      [Markup.button.callback(`👄 ${pronaunceScore}%`, "practiceBritishEnglish"),
        Markup.button.callback("✏️ 100%", "practiceAmericanEnglish")],
    ]).resize());
    await ctx.replyWithVoice({ source }, { caption: ctx.session.settings.hideQuestion ? spoiler(response.content) : response.content})
  } catch (error) {
    console.error('get voice: ', error.message) 
  }
})

bot.on(message('text'), ga4.view('user text message'), async (ctx) => {
  try {
    if (!ctx.session.settings) {
      return initialization(ctx);
    }
    ctx.sendChatAction('record_voice');
    const { grammarCheck } = ctx.session.settings;
    const grammar = grammarCheck ? await openAi.chat({
      messages: [
        { role: openAi.roles.SYSTEM, content: `It is ${ctx.session.settings.practiceLanguage}. Correct my spelling and grammar. Return text in quotes. Text: "${ctx.message.text}"` }]
    }.messages) : null;
    const corrected = grammar.content.match(/.*"([^"]+)"/)[0].slice(1, -1);
    const diffText = await diff(ctx.message.text, corrected)
    grammarCheck && corrected.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"") !== ctx.message.text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"") ? await ctx.replyWithHTML(`Correct: ${diffText}`) : null;
    ctx.session.messages = cutLongTermMemory(ctx.session.messages, 11, 2);
    ctx.session.messages.push({ role: openAi.roles.USER, content: ctx.message.text })
    const response = await openAi.chat(ctx.session.messages);
    ctx.session.messages.push({ role: openAi.roles.ASSISTANT, content: response.content })
    const source = await textConverter.textToSpeech(response.content, ctx.session.settings.practiceLanguage)
    await ctx.replyWithVoice({ source }, { caption: ctx.session.settings.hideQuestion ? spoiler(response.content) : response.content })

  } catch (error) {
    console.error('get text: ', error.message) 
  }
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))