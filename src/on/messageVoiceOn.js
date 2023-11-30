import { ERROR_MESSAGE } from '../constants.js';
import { openAi } from '../services/openAiService.js';
import { ogg } from '../services/audioConverterService.js';
import { pronounce } from '../services/pronounceService.js';
import { textConverter } from '../services/textToSpeechService.js';
import { diff, pronounceCorrect, cutLongTermMemory, logAsyncFunctionTime } from '../utils/utils.js';
import { Markup } from 'telegraf';

export default async (ctx) => {
  if (ctx.session.userData.premium) {
    console.log('premium user');
    if (ctx.session.userData.dayCost > ctx.session.settings.maxDayPaidCost) {
      ctx.reply('You have premium. Next lesson tommorow');
      return;
    }
  } else {
    console.log('trial user', ctx.session.userData.dayCost, ctx.session.settings.maxDayFreeCost);
    if (ctx.session.userData.dayCost > ctx.session.settings.maxDayFreeCost) {
      ctx.reply('You are on trial. Next lesson tommorow');
      return;
    }
  }
  let globalResponse;
  let isError = false;
  try {
    ctx.sendChatAction('typing');
    ctx.session?.lastCheckMessage?.message_id &&
      (await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.session.lastCheckMessage.message_id,
        0,
        ctx.session.lastCheckMessage.text,
        { entities: ctx.session.lastCheckMessage.entities },
      ));
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = ctx?.message?.from?.id;
    const oggPath = await ogg.create(link.href, userId);
    const [mp3Path, wavPath] = await Promise.all([
      ogg.toMp3(oggPath, userId),
      ogg.toWav(oggPath, userId),
    ]);
    let { text, cost: costTranscription } = await logAsyncFunctionTime(
      () =>
        openAi.transcription(
          mp3Path,
          ctx.session.settings.practiceLanguage,
          ctx.message.voice.duration,
        ),
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
        cost: costPronounce,
      },
      { message: grammar, cost: costGrammar },
      { message: response, cost: costAnswer },
    ] = await Promise.all([
      logAsyncFunctionTime(
        () => pronounce.getPronunciationAssessment(wavPath, text, ctx.message.voice.duration),
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
      logAsyncFunctionTime(() => openAi.chat(ctx.session.messages), 'openAi - make answer'),
    ]);
    ctx.session.userData.dayCost += costTranscription + costPronounce + costGrammar + costAnswer;
    globalResponse = response;
    ctx.sendChatAction('typing');
    const corrected = grammar?.content?.match(/.*"([^"]+)"/)[0].slice(1, -1) || '';
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
    ctx.session.pronounceText = await pronounceCorrect(pronounceText, pronounceWords);
    ctx.sendChatAction('typing');
    ctx.session.lastCheckMessage = {};
    ctx.session.lastCheckMessage = await ctx.replyWithHTML(
      `<b>Your message:</b>\n${text}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            `🎙 ${ctx.session?.pronounce?.pronounceScore || '-'}%`,
            'showPronounceDetails',
          ),
          Markup.button.callback(`✏️ ${ctx.session?.grammarScore || '-'}%`, 'showGrammarDetails'),
        ],
      ]).resize(),
    );
  } catch (error) {
    isError = true;
    console.error('check user message error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }

  try {
    ctx.sendChatAction('record_voice');
    ctx.session.messages.push({
      role: openAi.roles.ASSISTANT,
      content: globalResponse.content,
    });
    const { mp3: source, cost: textToSpeechCost } = await logAsyncFunctionTime(
      () =>
        textConverter.textToSpeech(
          `${globalResponse.content || ''}`,
          ctx.session.settings.practiceLanguage,
        ),
      'openAi - text to speech',
    );
    ctx.session.userData.dayCost += textToSpeechCost;
    ctx.session.lastResponse = globalResponse.content;
    await ctx.replyWithVoice(
      { source },
      Markup.keyboard([
        [Markup.button.callback(`🔤 Show text`), Markup.button.callback(`🆘 Hint please`)],
        [Markup.button.callback(`🔄 Change topic`), Markup.button.callback(`🏁 Finish & feedback`)],
      ]).resize(),
    );
    await ctx.reply(`cost: $${ctx.session.userData.dayCost}`);
    console.log('=============================================================================');
  } catch (error) {
    console.error('make audio error: ', error.message);
    !isError && (await ctx.reply(ERROR_MESSAGE));
  }
};
