import { Markup } from 'telegraf';
import { ERROR_MESSAGE, mode, scenarios } from '../constants.js';
import { openAi } from '../services/openAiService.js';
import { ogg } from '../services/audioConverterService.js';
import { pronounce } from '../services/pronounceService.js';
import { textConverter } from '../services/textToSpeechService.js';
import { diff, pronounceCorrect, cutLongTermMemory, logAsyncFunctionTime } from '../utils/utils.js';
import dailyUsage from '../helpers/dailyUsage.js';
import jobInterviewAction from '../actions/jobInterviewAction.js';

export default async (ctx) => {
  let globalResponse;
  try {
    ctx.session.userData.userAudioMessages ??= 0;
    ctx.session.userData.userAudioMessages += 1;
    if (await dailyUsage(ctx)) return;
    switch (ctx.session.settings.mode) {
      case mode.interviewPosition: {
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
        const userId = ctx?.message?.from?.id;
        const oggPath = await ogg.create(link.href, userId);
        const [mp3Path] = await Promise.all([ogg.toMp3(oggPath, userId)]);
        const { text, cost: costTranscription } = await logAsyncFunctionTime(
          () =>
            openAi.transcription(
              mp3Path,
              ctx.session.settings.practiceLanguage,
              ctx.message.voice.duration,
            ),
          'openAi - transcript audio',
        );
        const { message: response, cost: checkPositionCost } = await logAsyncFunctionTime(
          () =>
            openAi.chat(
              {
                messages: [
                  {
                    role: openAi.roles.SYSTEM,
                    content:
                      'Act as a job interviewer. You have to determine if there is a job position in the text. JSON must have two field position and isPosition.',
                  },
                  {
                    role: openAi.roles.USER,
                    content: text,
                  },
                ],
              }.messages,
              'gpt-3.5-turbo-1106',
              'json_object',
            ),
          'openAi - get job position',
        );
        ctx.session.userData.dayCost += costTranscription + checkPositionCost;
        ctx.session.settings.interview = {};
        ctx.session.settings.interview = JSON.parse(response.content);
        if (ctx.session.settings?.interview?.isPosition) {
          await ctx.replyWithHTML(
            `<b>Position</b>: ${ctx.session.settings.interview.position.replace(
              /(^\w|\s\w)/g,
              (m) => m.toUpperCase(),
            )}`,
          );
          ctx.session.settings.mode = mode.interview;
          await jobInterviewAction(ctx);
        } else {
          await ctx.reply(
            "I don't understand understand the position. Can you say it another way?",
          );
        }
        break;
      }
      case mode.interview:
      case mode.scenario:
      case mode.topic: {
        ctx.sendChatAction('typing');
        // eslint-disable-next-line no-unused-expressions
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
        const { text, cost: costTranscription } = await logAsyncFunctionTime(
          () =>
            openAi.transcription(
              mp3Path,
              ctx.session.settings.practiceLanguage,
              ctx.message.voice.duration,
            ),
          'openAi - transcript audio',
        );
        ctx.session.lastUserMessage ??= '';
        ctx.session.lastUserMessage = text;
        const modifiedText = /[A-Za-z]$/.test(text) ? `${text}.` : text;
        ctx.session.messages = cutLongTermMemory(ctx.session.messages, 16, 2);
        ctx.session.messages.push({ role: openAi.roles.USER, content: modifiedText });
        ctx.sendChatAction('typing');

        let pronounceScore;
        let pronounceText;
        let pronounceWords;
        let accuracyScore;
        let fluencyScore;
        let costPronounce;
        let grammar;
        let response;
        let costGrammar;
        let costAnswer;
        let goalsAndGrammar;
        let costGoalsAndGrammar;
        let textGoalsAchived;

        if (ctx.session.settings.mode === mode.scenario) {
          [
            {
              pronounceScore,
              pronounceText,
              pronounceWords,
              accuracyScore,
              fluencyScore,
              cost: costPronounce,
            },
            { message: goalsAndGrammar = 0, cost: costGoalsAndGrammar },
            { message: grammar, cost: costGrammar = 0 },
            { message: response, cost: costAnswer },
          ] = await Promise.all([
            logAsyncFunctionTime(
              () =>
                pronounce.getPronunciationAssessment(
                  wavPath,
                  modifiedText,
                  ctx.message.voice.duration,
                ),
              'microsoft - pronounce assasment',
            ),
            logAsyncFunctionTime(
              () =>
                openAi.chat(
                  {
                    messages: [
                      {
                        role: openAi.roles.SYSTEM,
                        content: `Act as an English teacher and check what goals I achieved. JSON format, field goals: true or false array. Scenario: ${
                          scenarios[0].description
                        } Goals: ${scenarios[ctx.session.currentScenarioIndex].goals
                          .map((item, index) => `${index + 1}. ${item}`)
                          .join(' ')}`,
                      },
                      ...ctx.session.messages.filter((item) => item.role === openAi.roles.USER),
                    ],
                  }.messages,
                  'gpt-4-1106-preview',
                  'json_object',
                ),
              'openAi - check goals and grammar',
            ),
            logAsyncFunctionTime(
              () =>
                openAi.chat(
                  {
                    messages: [
                      {
                        role: openAi.roles.SYSTEM,
                        content: `It is English. Correct my spelling and grammar. Return text in quotes. Text: "${modifiedText}"`,
                      },
                    ],
                  }.messages,
                ),
              'openAi - check grammar',
            ),
            logAsyncFunctionTime(() => openAi.chat(ctx.session.messages), 'openAi - make answer'),
          ]);
          const jsonGoalsAndGrammar = JSON.parse(goalsAndGrammar.content);
          if (jsonGoalsAndGrammar?.goals) {
            const { length } = jsonGoalsAndGrammar.goals;
            textGoalsAchived = '';
            if (!(ctx.session.currentScenarioIndex in ctx.session.userData.scenarioGoals)) {
              ctx.session.userData.scenarioGoals[ctx.session.currentScenarioIndex] = [
                false,
                false,
                false,
                false,
              ];
            }
            for (let i = 0; i < length; i += 1) {
              if (jsonGoalsAndGrammar.goals[i] && !ctx.session.currentScenarioGoals[i]) {
                ctx.session.currentScenarioGoals[i] = true;
                ctx.session.userData.scenarioGoals[ctx.session.currentScenarioIndex][i] = true;
                textGoalsAchived += textGoalsAchived
                  ? `\n🎉 ${scenarios[ctx.session.currentScenarioIndex].goals[i]}`
                  : `🎉 ${scenarios[ctx.session.currentScenarioIndex].goals[i]}`;
              }
            }
          }
        } else {
          [
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
              () =>
                pronounce.getPronunciationAssessment(
                  wavPath,
                  modifiedText,
                  ctx.message.voice.duration,
                ),
              'microsoft - pronounce assasment',
            ),
            logAsyncFunctionTime(
              () =>
                openAi.chat(
                  {
                    messages: [
                      {
                        role: openAi.roles.SYSTEM,
                        content: `It is English. Correct my spelling and grammar. Return text in quotes. Text: "${modifiedText}"`,
                      },
                    ],
                  }.messages,
                ),
              'openAi - check grammar',
            ),
            logAsyncFunctionTime(() => openAi.chat(ctx.session.messages), 'openAi - make answer'),
          ]);
        }
        ctx.session.userData.dayCost +=
          costTranscription + costPronounce + (costGrammar || costGoalsAndGrammar) + costAnswer;
        globalResponse = response;
        ctx.sendChatAction('typing');
        const corrected = grammar?.content?.match(/.*"([^"]+)"/)[0].slice(1, -1) || '';
        const { diffText, grammarScore } = await diff(modifiedText, corrected);
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
          ctx.session.settings.mode === mode.scenario
            ? Markup.inlineKeyboard([
                [
                  Markup.button.callback(
                    `🎯 ${
                      ctx.session?.currentScenarioGoals.filter((item) => item === true).length
                    }/4`,
                    'showGoalsDetails',
                  ),
                  Markup.button.callback(
                    `✏️ ${ctx.session?.grammarScore || '-'}%`,
                    'showGrammarDetails',
                  ),
                  Markup.button.callback(
                    `🎙 ${ctx.session?.pronounce?.pronounceScore || '-'}%`,
                    'showPronounceDetails',
                  ),
                ],
              ]).resize()
            : Markup.inlineKeyboard([
                [
                  Markup.button.callback(
                    `✏️ ${ctx.session?.grammarScore || '-'}%`,
                    'showGrammarDetails',
                  ),
                  Markup.button.callback(
                    `🎙 ${ctx.session?.pronounce?.pronounceScore || '-'}%`,
                    'showPronounceDetails',
                  ),
                ],
              ]).resize(),
        );
        if (textGoalsAchived) {
          await ctx.reply(textGoalsAchived);
        }
      }
      // eslint-disable-next-line no-fallthrough
      default: {
        ctx.sendChatAction('record_voice');
        if (await dailyUsage(ctx)) return;
        if (!globalResponse || !globalResponse.content) {
          throw new Error('globalResponse.content empty');
        }
        ctx.session.messages.push({
          role: openAi.roles.ASSISTANT,
          content: globalResponse.content,
        });
        const { mp3: source, cost: textToSpeechCost } = await logAsyncFunctionTime(
          () =>
            textConverter.textToSpeech(
              `${globalResponse.content}`,
              ctx.session.settings.practiceLanguage,
            ),
          'openAi - text to speech',
        );
        ctx.session.userData.dayCost += textToSpeechCost;
        ctx.session.lastResponse = globalResponse.content;
        await ctx.replyWithVoice(
          { source },
          Markup.keyboard([
            [Markup.button.callback(`🌐 Translate`), Markup.button.callback(`✨ Improve`)],
            [Markup.button.callback(`🔤 Show text`), Markup.button.callback(`🆘 Hint please`)],
            [
              Markup.button.callback(`🆕 New dialog`),
              Markup.button.callback(`🏁 Finish & feedback`),
            ],
          ]).resize(),
        );
        console.log(
          '=============================================================================',
        );
      }
    }
  } catch (error) {
    ctx.session.lastCheckMessage = {};
    console.error('check user message error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
