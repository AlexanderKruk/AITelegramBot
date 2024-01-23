import { ERROR_MESSAGE } from '../constants.js';
// import { openAi } from '../services/openAiService.js';
// import { diff, pronounceCorrect, cutLongTermMemory, logAsyncFunctionTime } from '../utils/utils.js';
// import { Markup } from 'telegraf';
// import dailyUsage from '../helpers/dailyUsage.js';

export default async (ctx) => {
  try {
    ctx.session.userData.userTextMessages ??= 0;
    ctx.session.userData.userTextMessages += 1;
    await ctx.reply('Please send me a voice 🎙 message.');
  } catch (error) {
    console.error('get text: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};

// export default async (ctx) => {
//   let globalResponseText;
//   let isError = false;
//   try {
//     // await ctx.reply('Please send me a voice 🎙 message.');
//     ctx.session.userData.userTextMessages
//       ? (ctx.session.userData.userTextMessages += 1)
//       : (ctx.session.userData.userTextMessages = 1);
//     if (await dailyUsage(ctx)) return;
//     ctx.sendChatAction('typing');
//     ctx.session?.lastCheckMessage?.message_id &&
//       (await ctx.telegram.editMessageText(
//         ctx.chat.id,
//         ctx.session.lastCheckMessage.message_id,
//         0,
//         ctx.session.lastCheckMessage.text,
//         { entities: ctx.session.lastCheckMessage.entities },
//       ));
//     // const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
//     // const userId = ctx?.message?.from?.id;
//     // const oggPath = await ogg.create(link.href, userId);
//     // const [mp3Path, wavPath] = await Promise.all([
//     //   ogg.toMp3(oggPath, userId),
//     //   ogg.toWav(oggPath, userId),
//     // ]);
//     // const { text, cost: costTranscription } = await logAsyncFunctionTime(
//     //   () =>
//     //     openAi.transcription(
//     //       mp3Path,
//     //       ctx.session.settings.practiceLanguage,
//     //       ctx.message.voice.duration,
//     //     ),
//     //   'openAi - transcript audio',
//     // );
//     const text = ctx.message.text;
//     const modifiedText = /[A-Za-z]$/.test(text) ? text + '.' : text;
//     ctx.session.messages = cutLongTermMemory(ctx.session.messages, 16, 2);
//     ctx.session.messages.push({ role: openAi.roles.USER, content: modifiedText });
//     ctx.sendChatAction('typing');
//     const [
//       // {
//       //   pronounceScore,
//       //   pronounceText,
//       //   pronounceWords,
//       //   accuracyScore,
//       //   fluencyScore,
//       //   cost: costPronounce,
//       // },
//       { message: grammar, cost: costGrammar },
//       { message: response, cost: costAnswer },
//     ] = await Promise.all([
//       // logAsyncFunctionTime(
//       //   () =>
//       //     pronounce.getPronunciationAssessment(wavPath, modifiedText, ctx.message.voice.duration),
//       //   'microsoft - pronounce assasment',
//       // ),
//       logAsyncFunctionTime(
//         () =>
//           openAi.chat(
//             {
//               messages: [
//                 {
//                   role: openAi.roles.SYSTEM,
//                   content: `It is English. Correct my spelling and grammar. Return text in quotes. Text: "${modifiedText}"`,
//                 },
//               ],
//             }.messages,
//           ),
//         'openAi - check grammar',
//       ),
//       logAsyncFunctionTime(() => openAi.chat(ctx.session.messages), 'openAi - make answer'),
//     ]);
//     ctx.session.userData.dayCost += costGrammar + costAnswer;
//     globalResponseText = response;
//     ctx.sendChatAction('typing');
//     const corrected = grammar?.content?.match(/.*"([^"]+)"/)[0].slice(1, -1) || '';
//     const { diffText, grammarScore } = await diff(modifiedText, corrected);
//     ctx.session.diffText = diffText || '';
//     ctx.session.grammarScore = grammarScore || '-';
//     ctx.session.grammarScores.push(Number(grammarScore) || 0);
//     ctx.session.pronounce = {
//       pronounceScore: '-',
//       accuracyScore: '-',
//       fluencyScore: '-',
//     };
//     // ctx.session.pronounseScores.push(Number(pronounceScore) || 0);
//     // ctx.session.pronounceText = await pronounceCorrect(pronounceText, pronounceWords);
//     ctx.sendChatAction('typing');
//     if (grammarScore < 100) {
//       ctx.session.lastCheckMessage = {};
//       ctx.session.lastCheckMessage = await ctx.replyWithHTML(
//         `<b>Correct grammar:</b>\n${ctx.session.diffText}`,
//         Markup.inlineKeyboard([
//           [
//             Markup.button.callback(
//               `🎙 ${ctx.session?.pronounce?.pronounceScore || '-'}%`,
//               'showPronounceDetails',
//             ),
//             Markup.button.callback(`✏️ ${ctx.session?.grammarScore || '-'}%`, 'Empty'),
//           ],
//         ]).resize(),
//       );
//     }
//   } catch (error) {
//     isError = true;
//     console.error('get text: ', error.message);
//     await ctx.reply(ERROR_MESSAGE);
//   }

//   try {
//     ctx.sendChatAction('typing');
//     // if (await dailyUsage(ctx)) return;
//     globalResponseText.content &&
//       ctx.session.messages.push({
//         role: openAi.roles.ASSISTANT,
//         content: globalResponseText.content,
//       });
//     // const { mp3: source, cost: textToSpeechCost } = await logAsyncFunctionTime(
//     //   () =>
//     //     textConverter.textToSpeech(
//     //       `${globalResponse.content || ''}`,
//     //       ctx.session.settings.practiceLanguage,
//     //     ),
//     //   'openAi - text to speech',
//     // );
//     // ctx.session.userData.dayCost += textToSpeechCost;
//     ctx.session.lastResponse = globalResponseText?.content;
//     ctx.session.lastResponse &&
//       (await ctx.reply(
//         globalResponseText.content,
//         Markup.keyboard([
//           [Markup.button.callback(`🆘 Hint please`)],
//           [
//             Markup.button.callback(`🆕 New dialog`),
//             Markup.button.callback(`🏁 Finish & feedback`),
//           ],
//         ]).resize(),
//       ));
//     console.log('=============================================================================');
//   } catch (error) {
//     console.error('make text error: ', error.message);
//     !isError && (await ctx.reply(ERROR_MESSAGE));
//   }
// };
