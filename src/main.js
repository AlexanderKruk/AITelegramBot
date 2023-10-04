import { Markup, Telegraf } from 'telegraf';
import LocalSession from 'telegraf-session-local'
import config from 'config';
import { message } from 'telegraf/filters'
import { ogg } from './ogg.js';
import { openAi } from './openai.js'
import { textConverter } from './text.js';
import { spoiler } from 'telegraf/format'

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.use((new LocalSession({ database: 'sessions.json' })).middleware())

const settings = {
  hideQuestion: false,
  grammarCheck: false,
  practiceLanguage: 'English',
  languageLevel: 'basic',
  topics: [],
  selectedTopic: "",
}

const INITIAL_SESSION = {
  messages: [],
  topicMessages: [],
  settings
}

const selectLanguageLevel = async (ctx) => {
  try {
    await ctx.reply("Select your language level", Markup.inlineKeyboard([
      Markup.button.callback("Beginner", "languageLevelBasic"),
      Markup.button.callback("Intermediate", "languageLevelIntermediate"),
      Markup.button.callback("Advanced", "languageLevelAdvanced")
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
      role: openAi.roles.SYSTEM, content: `Act as ${language} language teacher. Let's practice some dialogues. Answer in ${level} ${language} language, with maximum 3 sentences. Ask question at the end.`
    })
    ctx.session.topicMessages.push({
      role: openAi.roles.SYSTEM, content: `Answer only in ${language} language. Suggest numbered list of 3 topics for discuss at the ${level} level. Only titles. Maximum 44 characters each topic. No need to write amount of symbols`
    })
  } catch (error) {
    console.error('setChatGptSettings: ', error.message)
  }
}

const getTopic = async (ctx) => {
  try {
    const rawTopics = await openAi.chat(ctx.session.topicMessages);
    ctx.session.topicMessages.push({ role: openAi.roles.ASSISTANT, content: rawTopics.content })
    ctx.session.settings.topics = rawTopics.content.split('\n').map(item => item.slice(3).replace(/['"]+/g, ''));
    await ctx.reply("Select a topic:", Markup.inlineKeyboard([
      [Markup.button.callback(ctx.session.settings.topics[0], "selectTopic0Handler")],
      [Markup.button.callback(ctx.session.settings.topics[1], "selectTopic1Handler")],
      [Markup.button.callback(ctx.session.settings.topics[2], "selectTopic2Handler")],
      [Markup.button.callback("✏️ My own topic", "myOwnTopicHandler"), Markup.button.callback("🔄 Change topics", "changeTopics"),],
    ]))
  } catch (error) {
    console.error('getTopic: ', error.message)
  }
}

const chooseTopicMessage = async (ctx) => {
  try {
    switch (ctx.session.settings.practiceLanguage) {
      case 'English':
        await ctx.reply("What do you want to discuss?")
        break;
      case 'German':
        await ctx.reply("Was möchten Sie besprechen?")
        break;
      default:
        await ctx.reply("What do you want to discuss?")
    }
    await getTopic(ctx)
  } catch (error) {
    console.error('chooseTopicMessage: ', error.message) 
  }
}

const selectTopic = async (ctx, index) => {
  try {
    ctx.session.settings.selectedTopic = ctx.session.settings.topics[index]
    ctx.editMessageText('Topic: ' + ctx.session.settings.selectedTopic)
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
  { command: '/start', description: 'Choose language and level' },
  { command: '/new', description: 'Start new dialog' },
  { command: '/spoilers', description: 'Hide or show text answers' },
  // { command: '/check', description: 'Grammar check'},
])

bot.command('start', async (ctx) => {
  try {
    ctx.session = structuredClone(INITIAL_SESSION)
    await ctx.reply(`I will help you learn foreign languages.`)
    await ctx.reply("Select a language to learn", Markup.inlineKeyboard([
      [Markup.button.callback("English", "practiceLanguageEnglish"),
        Markup.button.callback("German", "practiceLanguageGerman")],
      [Markup.button.callback("Polish", "practiceLanguagePolish")]
    ]))
  } catch (error) {
    console.error('start command: ', error.message)
  }
})

bot.command('new', async (ctx) => {
  try {
    ctx.session = {
      ...structuredClone(INITIAL_SESSION),
      settings: ctx?.session?.settings || settings,
      topicMessages: ctx?.session?.topicMessages || []
    }
    await setChatGptSettings(ctx)
    await chooseTopicMessage(ctx)
  } catch (error) {
    console.error('new command: ', error.message)
  }
})

bot.command('spoilers', async (ctx) => {
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

bot.action("changeTopics", async (ctx) => {
  try {
    ctx.session.topicMessages.push({ role: openAi.roles.USER, content: `Update topics` })
    const rawTopics = await openAi.chat(ctx.session.topicMessages);
    ctx.session.topicMessages.push({ role: openAi.roles.ASSISTANT, content: rawTopics.content })
    ctx.session.settings.topics = rawTopics.content.split('\n').map(item => item.replace(/['"]+/g, ''));
    await ctx.editMessageText("Select a topic:", Markup.inlineKeyboard([
      [Markup.button.callback(ctx.session.settings.topics[0], "selectTopic0Handler")],
      [Markup.button.callback(ctx.session.settings.topics[1], "selectTopic1Handler")],
      [Markup.button.callback(ctx.session.settings.topics[2], "selectTopic2Handler")],
      [Markup.button.callback("✏️ My own topic", "practiceLanguageGerman"), Markup.button.callback("🔄 Change topics", "changeTopics"),],
    ]))
  } catch (error) {
    console.error('changeTopics: ', error.message) 
  }
})

bot.action("selectTopic0Handler", async (ctx) => {
  try {
    await selectTopic(ctx, 0) 
  } catch (error) {
    console.error('selectTopic0Handler: ', error.message); 
  }
})


bot.action("selectTopic1Handler", async (ctx) => {
  try {
    await selectTopic(ctx, 1) 
  } catch (error) {
    console.error('selectTopic1Handler: ', error.message); 
  }
})


bot.action("selectTopic2Handler", async (ctx) => {
  try {
    await selectTopic(ctx, 2) 
  } catch (error) {
    console.error('selectTopic2Handler: ', error.message); 
  }
})

bot.action("myOwnTopicHandler", async (ctx) => {
  try {
    await ctx.deleteMessage();
  } catch (error) {
    console.error('myOwnTopic: ', error.message); 
  }
})


bot.action("practiceLanguageGerman", async (ctx) => {
  try {
    ctx.session.settings.practiceLanguage = "German";
    await ctx.editMessageText("German selected")
    await selectLanguageLevel(ctx);
  } catch (error) {
    console.error('practiceLanguageGerman: ', error.message);
  }
})

bot.action("practiceLanguageEnglish", async (ctx) => {
  try {
    ctx.session.settings.practiceLanguage = "English";
    await ctx.editMessageText("English selected")
    await selectLanguageLevel(ctx);
  } catch (error) {
    console.error('practiceLanguageEnglish: ', error.message);
  }
})

bot.action("practiceLanguagePolish", async (ctx) => {
  try {
    ctx.session.settings.practiceLanguage = "Polish";
    await ctx.editMessageText("Polish selected")
    await selectLanguageLevel(ctx);
  } catch (error) {
    console.error('practiceLanguagePolish: ', error.message);
  }
})

bot.action("languageLevelBasic", async (ctx) => {
  try {
    ctx.session.settings.languageLevel = "basic";
    await setChatGptSettings(ctx);
    await ctx.editMessageText("Beginner level selected")
    await chooseTopicMessage(ctx);
  } catch (error) {
    console.error('languageLevelBasic: ', error.message);
  }
})

bot.action("languageLevelIntermediate", async (ctx) => {
  try {
    ctx.session.settings.languageLevel = "intermediate";
    await setChatGptSettings(ctx);
    await ctx.editMessageText("Intermediate level selected");
    await chooseTopicMessage(ctx);
  } catch (error) {
    console.error('languageLevelIntermediate: ', error.message);
  }
})

bot.action("languageLevelAdvanced", async (ctx) => {
  try {
    ctx.session.settings.languageLevel = "advanced";
    await setChatGptSettings(ctx);
    await ctx.editMessageText("Advanced level selected");
    await chooseTopicMessage(ctx);
  } catch (error) {
    console.error('languageLevelAdvanced: ', error.message);
  }
})

bot.on(message('voice'), async (ctx) => {
  try {
    ctx.sendChatAction('record_voice');
    // const { grammarCheck } = ctx.session.settings;
    ctx.session ??= structuredClone(INITIAL_SESSION);
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = ctx.message.from.id;
    const oggPath = await ogg.create(link.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openAi.transcription(mp3Path, ctx.session.settings.practiceLanguage);
    // const grammar = grammarCheck ? await openAi.chat({
    //   messages: [
    //     { role: openAi.roles.SYSTEM, content: "Correct my spelling and grammar." },
    //     { role: openAi.roles.USER, content: text }]
    // }.messages) : null;
    // grammarCheck && grammar.content !== text ? await ctx.reply(`Your message: ${text}\nCorrect: ${grammar.content}`) : await ctx.reply(`Your message: ${text}`);
    ctx.session.messages.push({ role: openAi.roles.USER, content: text })
    const response = await openAi.chat(ctx.session.messages);
    ctx.session.messages.push({ role: openAi.roles.ASSISTANT, content: response.content })
    const source = await textConverter.textToSpeech(`${response.content}`, ctx.session.settings.practiceLanguage)
    await ctx.replyWithVoice({ source }, { caption: ctx.session.settings.hideQuestion ? spoiler(response.content) : response.content})
  } catch (error) {
    console.error('get voice: ', error.message) 
  }
})

bot.on(message('text'), async (ctx) => {
  try {
    ctx.sendChatAction('record_voice');
    ctx.session ??= structuredClone(INITIAL_SESSION);
    // const { grammarCheck } = ctx.session.settings;
    
    // const grammar = grammarCheck ? await openAi.chat({
    //   messages: [
    //     { role: openAi.roles.SYSTEM, content: "I am studying English. Correct my mistakes if they exist in separate text block that start with Correct:. 2. Suggest one alternative of this sentences in text block start with Alternative:." },
    //     { role: openAi.roles.USER, content: ctx.message.text }]
    // }.messages) : null;
    // grammarCheck && grammar.content !== ctx.message.text ? await ctx.reply(`${grammar.content}`) : null;

    ctx.session.messages.push({role: openAi.roles.USER, content: ctx.message.text})
    const response = await openAi.chat(ctx.session.messages);
    ctx.session.messages.push({ role: openAi.roles.ASSISTANT, content: response.content })
    
    const source = await textConverter.textToSpeech(response.content, ctx.session.settings.practiceLanguage)
    await ctx.replyWithVoice({ source }, { caption: ctx.session.settings.hideQuestion ? spoiler(response.content) : response.content})
  } catch (error) {
    console.error('get text: ', error.message) 
  }
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))