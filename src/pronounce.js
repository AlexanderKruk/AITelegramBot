import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import * as fs from 'fs';
import config from 'config';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export const __dirname = dirname(fileURLToPath(import.meta.url))

class Pronounce {
  constructor() {}

  async getPronunciationAssessment(wavPath, reference_text) {
    try {
            var audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(resolve(wavPath)));
            var speechConfig = sdk.SpeechConfig.fromSubscription(config.get('MS_SUBSCRIPTION_KEY'), "eastus");
            // create pronunciation assessment config, set grading system, granularity and if enable miscue based on your requirement.
            const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig.fromJSON(
              "{\"GradingSystem\": \"HundredMark\", \
              \"Granularity\": \"Phoneme\", \
              \"EnableMiscue\": \"True\", \
              \"EnableProsodyAssessment\": \"True\"}"
            );
            pronunciationAssessmentConfig.referenceText = reference_text;

            // setting the recognition language to English.
            speechConfig.speechRecognitionLanguage = "en-GB";

            // create the speech recognizer.
            var reco = new sdk.SpeechRecognizer(speechConfig, audioConfig);
            pronunciationAssessmentConfig.applyTo(reco);

            function onRecognizedResult(result) {
                // console.log("pronunciation assessment for: ", result.text);
                var pronunciation_result = sdk.PronunciationAssessmentResult.fromResult(result);
                // console.log(" Accuracy score: ", pronunciation_result.accuracyScore, '\n',
                //     "pronunciation score: ", pronunciation_result.pronunciationScore, '\n',
                //     "completeness score : ", pronunciation_result.completenessScore, '\n',
                //   "fluency score: ", pronunciation_result.fluencyScore, '\n',
                //   "propsody score", pronunciation_result.privPronJson.PronunciationAssessment.ProsodyScore,
                // );
                var prosodyScore = pronunciation_result.privPronJson.PronunciationAssessment.ProsodyScore
                // console.log('MyPronScore', pronunciation_result.accuracyScore * 0.5 + prosodyScore * 0.2 + pronunciation_result.fluencyScore * 0.3)
              // console.log("  Word-level details:");
              console.log('Results', pronunciation_result);
                // pronunciation_result.detailResult.Words.forEach( (word, idx) => {
                //     console.log("    ", idx + 1, ": word: ", word.Word, "\taccuracy score: ", word.PronunciationAssessment.AccuracyScore, "\terror type: ", word.PronunciationAssessment.ErrorType, ";");
                // });
              reco.close();
              return Math.round(pronunciation_result.accuracyScore * 0.5 + prosodyScore * 0.2 + pronunciation_result.fluencyScore * 0.3)
            }

      
            reco.recognizeOnceAsync(
                function (successfulResult) {
                    onRecognizedResult(successfulResult);
                }
            )
          return new Promise((resolve, reject) => {
            reco.recognizeOnceAsync(
                function (successfulResult) {
                resolve(onRecognizedResult(successfulResult));
                }
            )
          })
    } catch(error) {
      console.log('getPronunciationAssessment error', error.message);
    }
  }

}

export const pronounce = new Pronounce()