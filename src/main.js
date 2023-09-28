import { Markup, Telegraf, session } from 'telegraf';
import LocalSession from 'telegraf-session-local'
import config from 'config';
import { message } from 'telegraf/filters'
import { ogg } from './ogg.js';
import { openAi } from './openai.js'
import { textConverter } from './text.js';
import { spoiler } from 'telegraf/format'

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.use((new LocalSession({ database: 'sessions.json' })).middleware())

// const INITIAL_SESSION = {
//   messages: [{role: openAi.roles.SYSTEM, content: "Imagine that you are my best male friend, we are having a conversation. I want to hear words of support and clarifying questions. The answer should be a maximum of one or two simple and short sentences."}]
// }

// const INITIAL_SESSION = {
//   messages: [{role: openAi.roles.SYSTEM, content: "Давай поиграем в игру. Ты закадываешь простое слово, но не говоришь мне его. На мои вопросы ты отвечаешь только да или нет. Нельзя давать подсказки сужающие поиск слова. Если я написал слово а не вопрос, значит это мой вариант слова. Всего три попытки отгадать слово. Менять правила нельзя."}]
// }

// const INITIAL_SESSION = {
//   messages: [{ role: openAi.roles.SYSTEM, content: "I am studying English. Let's practice some dialogues. Answer simply, with maximum 3 sentences. Ask question at the end." }],
//   settings: { hideQuestion: false, grammarCheck: true }
// }

const settings = { hideQuestion: false, grammarCheck: false, practiceLanguage: 'English', languageLevel: 'basic' }

const INITIAL_SESSION = {
  messages: [],
  settings
}

const selectLanguageLevel = async (ctx) => {
  await ctx.reply("Select your language level", Markup.inlineKeyboard([
    Markup.button.callback("Basic", "languageLevelBasic"),
    Markup.button.callback("Intermediate", "languageLevelIntermediate"),
    Markup.button.callback("Advanced", "languageLevelAdvanced")
  ]))
}

const setChatGptSettings = async (ctx) => {
  const level = ctx.session.settings.languageLevel || settings.languageLevel
  const language = ctx.session.settings.practiceLanguage || settings.practiceLanguage
  ctx.session.messages.push({
  role: openAi.roles.SYSTEM, content: `Act as ${language} language teacher. Let's practice some dialogues. Answer in ${level} ${language} language, with maximum 3 sentences. Ask question at the end.` })
}

const chooseTopicMessage = async (ctx) => {
   switch (ctx.session.settings.practiceLanguage) {
    case 'English':
      await ctx.reply("What shall we discuss? I can suggest a topic.")
      return;
    case 'German':
      await ctx.reply("Was sollen wir besprechen? Ich kann ein Thema vorschlagen.")
      return;
    default:
      await ctx.reply("What shall we discuss? I can suggest a topic.")
  }
}

bot.telegram.setMyCommands([
  { command: '/start', description: 'Choose language and level' },
  { command: '/new', description: 'Start new dialog' },
  { command: '/spoilers', description: 'Hide or show text answers' },
  { command: '/check', description: 'Grammar check'},
])

bot.command('start', async (ctx) => {
  try {
    ctx.session = structuredClone(INITIAL_SESSION)
    await ctx.reply(`I will help you learn foreign languages.`)
    await ctx.reply("Select a language to learn", Markup.inlineKeyboard([
      Markup.button.callback("English", "practiceLanguageEnglish"),
      Markup.button.callback("German", "practiceLanguageGerman")
    ]))
  } catch (error) {
    console.log('start command error', error.message)
  }
})

bot.command('new', async (ctx) => {
  try {
    ctx.session = { ...structuredClone(INITIAL_SESSION), settings: ctx?.session?.settings || settings }
    await chooseTopicMessage(ctx)
    await setChatGptSettings(ctx)
  } catch (error) {
    console.log('new command error', error.message)
  }
})

bot.command('spoilers', async (ctx) => {
  try {
    ctx.session.settings.hideQuestion = !ctx.session.settings.hideQuestion;
    ctx.session.settings.hideQuestion ? await ctx.reply('Spoiler activated') : await ctx.reply('Spoiler disabled');
  } catch (error) {
    console.log('spoilers command error', error.message)
  }
})

bot.command('check', async (ctx) => {
  try {
    ctx.session.settings.grammarCheck = !ctx.session.settings.grammarCheck;
    ctx.session.settings.grammarCheck ? await ctx.reply('Grammar check activated') : await ctx.reply('Grammar check disabled');
  } catch (error) {
    console.log('check command error', error.message)
  }
})

bot.action("practiceLanguageGerman", async (ctx) => {
  ctx.session.settings.practiceLanguage = "German";
  await ctx.editMessageText("German selected")
  await selectLanguageLevel(ctx);
})

bot.action("practiceLanguageEnglish", async (ctx) => {
  ctx.session.settings.practiceLanguage = "English";
  await ctx.editMessageText("English selected")
  await selectLanguageLevel(ctx);
})

bot.action("languageLevelBasic", async (ctx) => {
  ctx.session.settings.languageLevel = "basic";
  await setChatGptSettings(ctx);
  await ctx.editMessageText("Basic level selected")
  await chooseTopicMessage(ctx);
})

bot.action("languageLevelIntermediate", async (ctx) => {
  ctx.session.settings.languageLevel = "intermediate";
  await setChatGptSettings(ctx);
  await ctx.editMessageText("Intermediate level selected");
  await chooseTopicMessage(ctx);
})

bot.action("languageLevelAdvanced", async (ctx) => {
  ctx.session.settings.languageLevel = "advanced";
  await setChatGptSettings(ctx);
  await ctx.editMessageText("Advanced level selected");
  await chooseTopicMessage(ctx);
})

bot.on(message('voice'), async (ctx) => {
  try {
    const { grammarCheck } = ctx.session.settings;
    ctx.session ??= structuredClone(INITIAL_SESSION);
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = ctx.message.from.id;
    const oggPath = await ogg.create(link.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openAi.transcription(mp3Path);
    const grammar = grammarCheck ? await openAi.chat({
      messages: [
        { role: openAi.roles.SYSTEM, content: "Correct my spelling and grammar." },
        { role: openAi.roles.USER, content: text }]
    }.messages) : null;
    grammarCheck && grammar.content !== text ? await ctx.reply(`Your message: ${text}\nCorrect: ${grammar.content}`) : await ctx.reply(`Your message: ${text}`);
    ctx.session.messages.push({ role: openAi.roles.USER, content: text })
    const response = await openAi.chat(ctx.session.messages);
    ctx.session.messages.push({ role: openAi.roles.ASSISTANT, content: response.content })
    const source = await textConverter.textToSpeech(`${response.content}`, ctx.session.settings.practiceLanguage)
    // await ctx.sendAudio({ source })
    await ctx.replyWithVoice({ source })
    ctx.session.settings.hideQuestion ? await ctx.reply(spoiler(response.content))  : await ctx.reply(response.content);
  } catch (error) {
    console.log('get voice error', error.message) 
  }
})

bot.on(message('text'), async (ctx) => {
  try {
    ctx.session ??= structuredClone(INITIAL_SESSION);
    const { grammarCheck } = ctx.session.settings;
    
    const grammar = grammarCheck ? await openAi.chat({
      messages: [
        { role: openAi.roles.SYSTEM, content: "I am studying English. Correct my mistakes if they exist in separate text block that start with Correct:. 2. Suggest one alternative of this sentences in text block start with Alternative:." },
        { role: openAi.roles.USER, content: ctx.message.text }]
    }.messages) : null;
    grammarCheck && grammar.content !== ctx.message.text ? await ctx.reply(`${grammar.content}`) : null;

    ctx.session.messages.push({role: openAi.roles.USER, content: ctx.message.text})
    const response = await openAi.chat(ctx.session.messages);
    ctx.session.messages.push({ role: openAi.roles.ASSISTANT, content: response.content })
    
    const source = await textConverter.textToSpeech(response.content, ctx.session.settings.practiceLanguage)
    await ctx.replyWithVoice({ source })

    ctx.session.settings.hideQuestion ? await ctx.reply(spoiler(response.content))  : await ctx.reply(response.content);
  } catch (error) {
    console.log('get text error', error.message) 
  }
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))