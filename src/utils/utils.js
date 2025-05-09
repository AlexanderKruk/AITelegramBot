import { unlink } from 'fs/promises';
import { Markup } from 'telegraf';
import * as Diff from 'diff';
import { scenarios } from '../constants.js';

export async function removeFile(path) {
  try {
    unlink(path);
  } catch (error) {
    console.log('removeFile', error.message);
  }
}

export function diff(one, other) {
  const allWords = one.split(' ').length;
  let errors = 0;
  const diffWords = Diff.diffWords(one, other);
  let text = '';
  // eslint-disable-next-line no-restricted-syntax
  for (const item of diffWords) {
    if (item.added) {
      text += `<u>${item.value}</u>`;
      errors += 1;
    } else if (item.removed) {
      text += `<s>${item.value}</s> `;
    } else {
      text += item.value;
    }
  }
  const grammarScore = Math.round(((allWords - errors) / allWords) * 100);
  // const percentOfRight = allWords - errors
  return { diffText: text, grammarScore };
}

export function pronounceCorrect(pronounceText = '', pronounceWords = []) {
  const returnWords = pronounceText.split(' ');
  let correctResult = '';
  // eslint-disable-next-line no-restricted-syntax
  for (const [index, word] of pronounceWords.entries()) {
    if (word.PronunciationAssessment.AccuracyScore < 80) {
      correctResult += `<u>${returnWords[index]}</u> `;
    } else {
      correctResult += `${returnWords[index]} `;
    }
  }
  return correctResult;
}

export async function logAsyncFunctionTime(asyncFunction, functionName, timeoutMillis = 20000) {
  const startTime = Date.now();
  try {
    const timeoutPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        reject(new Error(`Promise timed out after ${timeoutMillis} milliseconds`));
      }, timeoutMillis);
    });
    const result = await Promise.race([asyncFunction(), timeoutPromise]);
    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    console.log(`Function: ${functionName} - Processing Time: ${elapsedTime}ms`);
    return result;
  } catch (error) {
    console.error(`Function: ${functionName} - Error: ${error.message}`);
    throw error;
  }
}

export function getRandomIndexes(max, count) {
  const indexes = [];
  while (indexes.length < count) {
    const randomIndex = Math.floor(Math.random() * max);
    if (!indexes.includes(randomIndex)) {
      indexes.push(randomIndex);
    }
  }
  return indexes;
}

export const cutLongTermMemory = (data, length, startFrom) => {
  const dataLength = data.length;
  if (dataLength > length - startFrom) {
    return [...data.slice(0, startFrom), ...data.slice((length - startFrom) * -1)];
  }
  return data;
};

export const calculateScenariosMenuButtons = (ctx) => {
  const buttons = [];
  ctx.session.userData.currentScenariosPage ??= 1;
  ctx.session.userData.scenarioGoals ??= {};
  for (let i = 0; i < 4; i += 1) {
    const index = i + (ctx.session.userData.currentScenariosPage - 1) * 4;
    buttons.push([
      Markup.button.callback(
        `${scenarios[index].title} (${
          ctx.session.userData?.scenarioGoals[index]?.filter((item) => item === true).length || 0
        }/4)`,
        `selectScenario${i}`,
      ),
    ]);
  }
  return buttons;
};

export const average = (arr = []) => Math.round(arr.reduce((p, c) => p + c, 0) / arr.length);
