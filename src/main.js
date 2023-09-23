import { Telegraf, session } from 'telegraf';
import config from 'config';
import { message } from 'telegraf/filters'
import { ogg } from './ogg.js';
import { openAi } from './openai.js'
// import { code } from 'telegraf/format'

console.log(config.get("TEST_ENV"))

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.use(session())

const INITIAL_SESSION = {
  messages: [{role: openAi.roles.SYSTEM, content: "Imagine that you are my best male friend, we are having a conversation. I want to hear words of support and clarifying questions. The answer should be a maximum of one or two simple and short sentences."}]
}

bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION
  ctx.reply('Привет, я AI Friend и готов тебя выслушать и поддержать. Ты можешь писать текстом или голосовыми.')
})
bot.command('new', async (ctx) => {
  ctx.session = INITIAL_SESSION
  ctx.reply('Привет, я AI Friend и готов тебя выслушать и поддержать. Ты можешь писать текстом или голосовыми.')
})

bot.on(message('voice'), async (ctx) => {
  try {
    ctx.session ??= INITIAL_SESSION
    // await ctx.reply(code('Cooбщение принял. Жду ответ'))
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = ctx.message.from.id;
    const oggPath = await ogg.create(link.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openAi.transcription(mp3Path);
    // await ctx.reply(code(`Ваш запрос: ${text}`));

    ctx.session.messages.push({role: openAi.roles.USER, content: text})
    const response = await openAi.chat(ctx.session.messages);
    ctx.session.messages.push({role: openAi.roles.ASSISTANT, content: response.content})

    await ctx.reply(response.content);
  } catch (error) {
    console.log('get voice error', error.message) 
  }
})

bot.on(message('text'), async (ctx) => {
  try {
    ctx.session ??= INITIAL_SESSION

    ctx.session.messages.push({role: openAi.roles.USER, content: ctx.message.text})
    const response = await openAi.chat(ctx.session.messages);
    ctx.session.messages.push({role: openAi.roles.ASSISTANT, content: response.content})

    await ctx.reply(response.content);
  } catch (error) {
    console.log('get voice error', error.message) 
  }
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))