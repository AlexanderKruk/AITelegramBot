import { unlink } from 'fs/promises';
import * as Diff from 'diff';

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
  const diff = Diff.diffWords(one, other);
  let text = '';
  for (const item of diff) {
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

export function pronounceCorrect(pronounceText, pronounceWords) {
  const returnWords = pronounceText.split(' ');
  let correctResult = '';
  for (const [index, word] of pronounceWords.entries()) {
    if (word.PronunciationAssessment.AccuracyScore < 90) {
      correctResult += `<u>${returnWords[index]}</u> `;
    } else {
      correctResult += `${returnWords[index]} `;
    }
  }
  return correctResult;
}

export async function logAsyncFunctionTime(asyncFunction, functionName) {
  const startTime = Date.now();
  try {
    const result = await asyncFunction();
    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    console.log(
      `Function: ${functionName} - Processing Time: ${elapsedTime}ms`,
    );
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
