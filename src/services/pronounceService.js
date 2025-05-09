import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import * as fs from 'fs';
import config from 'config';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { prices } from '../constants.js';

// eslint-disable-next-line no-underscore-dangle
export const __dirname = dirname(fileURLToPath(import.meta.url));

class Pronounce {
  // eslint-disable-next-line class-methods-use-this
  async getPronunciationAssessment(wavPath, referenceText, duration) {
    try {
      const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(resolve(wavPath)));
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        config.get('MS_SUBSCRIPTION_KEY'),
        'germanywestcentral',
      );
      // create pronunciation assessment config, set grading system, granularity and if enable miscue based on your requirement.
      // eslint-disable-next-line
      const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig.fromJSON(
        // eslint-disable-next-line no-multi-str
        '{"GradingSystem": "HundredMark", \
              "Granularity": "Word", \
              "EnableMiscue": "False", \
              "EnableProsodyAssessment": "False"}',
      );
      pronunciationAssessmentConfig.referenceText = referenceText;

      // setting the recognition language to English.
      speechConfig.speechRecognitionLanguage = 'en-GB';

      // create the speech recognizer.
      const reco = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      pronunciationAssessmentConfig.applyTo(reco);

      // eslint-disable-next-line no-inner-declarations
      function onRecognizedResult(result) {
        // console.log('pronunciation assessment for: ', reference_text);
        // console.log('pronunciation assessment for: ', result.text);
        const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);
        // console.log(" Accuracy score: ", pronunciation_result.accuracyScore, '\n',
        //     "pronunciation score: ", pronunciation_result.pronunciationScore, '\n',
        //     "completeness score : ", pronunciation_result.completenessScore, '\n',
        //   "fluency score: ", pronunciation_result.fluencyScore, '\n',
        //   "propsody score", pronunciation_result.privPronJson.PronunciationAssessment.ProsodyScore,
        // );
        // var prosodyScore =
        //   pronunciation_result.privPronJson.PronunciationAssessment
        //     .ProsodyScore;
        // console.log(
        //   'MyPronScore',
        //   pronunciation_result.accuracyScore * 0.5 +
        //     prosodyScore * 0.2 +
        //     pronunciation_result.fluencyScore * 0.3,
        // );
        // console.log('  Word-level details:');
        // pronunciation_result.detailResult.Words.forEach((word, idx) => {
        //   console.log(
        //     '    ',
        //     idx + 1,
        //     ': word: ',
        //     word.Word,
        //     '\taccuracy score: ',
        //     word.PronunciationAssessment.AccuracyScore,
        //     '\terror type: ',
        //     word.PronunciationAssessment.ErrorType,
        //     ';',
        //   );
        // });
        reco.close();
        const pronounceScore = Math.round(
          pronunciationResult.accuracyScore * 0.6 +
            pronunciationResult.fluencyScore * 0.2 +
            pronunciationResult.completenessScore * 0.2,
        );
        return {
          pronounceScore,
          pronounceText: result.text,
          pronounceWords: pronunciationResult.detailResult.Words,
          accuracyScore: pronunciationResult.accuracyScore,
          fluencyScore: pronunciationResult.fluencyScore,
          cost: duration * prices['pronunciation-assessment'].audio,
        };
      }

      // reco.recognizeOnceAsync(function (successfulResult) {
      //   onRecognizedResult(successfulResult);
      // });

      return new Promise((res, reject) => {
        reco.recognizeOnceAsync(
          (successfulResult) => res(onRecognizedResult(successfulResult)),
          (error) => reject(error.message),
        );
      });
    } catch (error) {
      console.log('getPronunciationAssessment error', error.message);
    }
    return null;
  }
}

export const pronounce = new Pronounce();
