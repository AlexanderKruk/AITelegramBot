import { unlink } from 'fs/promises'
import * as Diff from "diff";

export async function removeFile(path) {
  try {
    unlink(path)
  } catch (error) {
    console.log('removeFile', error.message)
  }
}

export async function diff(one, other) {
  const diff = Diff.diffWords(one, other);
  let text = ""
  for (const item of diff) {
    if (item.added) {
      text += `<u>${item.value}</u>`
    } else if (item.removed) {
      text += `<s>${item.value}</s> `
    } else {
      text += item.value
    }
  };
  return text;
}