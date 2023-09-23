import { unlink } from 'fs/promises'

export async function removeFile(path) {
  try {
    unlink(path)
  } catch (error) {
    console.log('removeFile', error.message)
  }
}