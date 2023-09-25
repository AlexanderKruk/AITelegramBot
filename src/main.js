import { Telegraf, session } from 'telegraf';
import config from 'config';
import { message } from 'telegraf/filters'
import { ogg } from './ogg.js';
import { openAi } from './openai.js'
import { textConverter } from './text.js';
import { spoiler } from 'telegraf/format'

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.use(session());

// const INITIAL_SESSION = {
//   messages: [{role: openAi.roles.SYSTEM, content: "Imagine that you are my best male friend, we are having a conversation. I want to hear words of support and clarifying questions. The answer should be a maximum of one or two simple and short sentences."}]
// }

// const INITIAL_SESSION = {
//   messages: [{role: openAi.roles.SYSTEM, content: "Давай поиграем в игру. Ты закадываешь простое слово, но не говоришь мне его. На мои вопросы ты отвечаешь только да или нет. Нельзя давать подсказки сужающие поиск слова. Если я написал слово а не вопрос, значит это мой вариант слова. Всего три попытки отгадать слово. Менять правила нельзя."}]
// }

const INITIAL_SESSION = {
  messages: [{ role: openAi.roles.SYSTEM, content: "I am studying English. Let's practice some dialogues. Answer simply, with maximum 3 sentences. Ask question at the end." }],
  settings: { hideQuestion: false }
}

bot.telegram.setMyCommands([
  { command: '/new', description: 'Start new dialog' },
  { command: '/hide', description: 'Hide or show bot question' },
])

const greetings = async (ctx) => {
  ctx.reply("Hi. Let's practice English. Choose topic")
}

bot.command('start', async (ctx) => {
  ctx.session = { ...INITIAL_SESSION }
  await greetings(ctx)
})
bot.command('new', async (ctx) => {
  ctx.session = {...INITIAL_SESSION}
  await greetings(ctx)
})

bot.command('hide', async (ctx) => {
  ctx.session.settings.hideQuestion = !ctx.session.settings.hideQuestion;
})

bot.on(message('voice'), async (ctx) => {
  try {
    ctx.session ??= INITIAL_SESSION;
    console.log('text session', ctx.session);
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = ctx.message.from.id;
    const oggPath = await ogg.create(link.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openAi.transcription(mp3Path);
    const grammar = await openAi.chat({
      messages: [
        { role: openAi.roles.SYSTEM, content: "Correct my spelling and grammar." },
        { role: openAi.roles.USER, content: text }]
    }.messages)
    grammar.content !== text ? await ctx.reply(`Your message: ${text}\nCorrect: ${grammar.content}`) : await ctx.reply(`Your message: ${text}`);
    ctx.session.messages.push({ role: openAi.roles.USER, content: grammar.content })
    const response = await openAi.chat(ctx.session.messages);
    ctx.session.messages.push({ role: openAi.roles.ASSISTANT, content: response.content })
    const source = await textConverter.textToSpeech(`${response.content}`)
    // await ctx.sendAudio({ source })
    await ctx.replyWithVoice({ source })
    ctx.session.settings.hideQuestion ? await ctx.reply(spoiler(response.content))  : await ctx.reply(response.content);
  } catch (error) {
    console.log('get voice error', error.message) 
  }
})

bot.on(message('text'), async (ctx) => {
  try {
    ctx.session ??= INITIAL_SESSION
    console.log('text session', ctx.session);
    const grammar = await openAi.chat({
      messages: [
        { role: openAi.roles.SYSTEM, content: "Correct my spelling and grammar." },
        { role: openAi.roles.USER, content: ctx.message.text }]
    }.messages)
    grammar.content !== ctx.message.text ? await ctx.reply(`Correct: ${grammar.content}`) : null;

    ctx.session.messages.push({role: openAi.roles.USER, content: ctx.message.text})
    const response = await openAi.chat(ctx.session.messages);
    ctx.session.messages.push({ role: openAi.roles.ASSISTANT, content: response.content })
    const source = await textConverter.textToSpeech(response.content)

    await ctx.replyWithVoice({ source })
    ctx.session.settings.hideQuestion ? await ctx.reply(spoiler(response.content))  : await ctx.reply(response.content);
  } catch (error) {
    console.log('get text error', error.message) 
  }
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))