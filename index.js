const Sonus = require('sonus')
var util = require('util');
var fs = require('fs');
const fetch = require('node-fetch');
var player = require('play-sound')(opts = {})
const speech = require('@google-cloud/speech')
const textToSpeech = require('@google-cloud/text-to-speech');
const client = new speech.SpeechClient({
  projectId: 'streaming-speech-sample',
  keyFilename: './keyfile.json'
})
const client2 = new textToSpeech.TextToSpeechClient({
  projectId: 'streaming-speech-sample',
  keyFilename: './keyfile.json'
});

const { dockStart } = require('@nlpjs/basic');

(async () => {
  const dock = await dockStart({ use: ['Basic']});
  const nlp = dock.get('nlp');
  nlp.addLanguage('it');
  // Adds the utterances and intents for the NLP
  nlp.addDocument('it','ciao','saluti.ciao');
  
  // Train also the NLG
  nlp.addAnswer('it', 'saluti.ciao', 'hehe');  await nlp.train();
  const response = await nlp.process('it', 'ciao');
  console.log(response);
})();


async function quickStart(text) {

  // Construct the request
  const request = {
    input: {text: text},
    // Select the language and SSML voice gender (optional)
    voice: {languageCode: 'it-IT', voiceName: 'it-IT-Wavenet-D', ssmlGender: 'MALE'},
    // select the type of audio encoding
    audioConfig: {audioEncoding: 'MP3', pitch: -5, speakingRate: 0.9},
  };

  // Performs the text-to-speech request
  const [response] = await client2.synthesizeSpeech(request);
  // Write the binary audio content to a local file
  const writeFile = util.promisify(fs.writeFile);
  await writeFile('output.mp3', response.audioContent, 'binary');
  console.log('Audio content written to file: output.mp3');
  player.play('./output.mp3', function(err){
  if (err) throw err
})
}

const hotwords = [
    {file: './ei mario.pmdl', hotword: 'ei mario'},
    {file: './senti mario.pmdl', hotword: 'senti mario'},
    ]

const language = 'it-IT';

const sonus = Sonus.init({ hotwords, language, recordProgram: 'rec' }, client);
Sonus.start(sonus)
//console.log('Say "' + hotwords[0].hotword + '"...')
console.log('---');

sonus.on('hotword', (index, keyword) => {
	console.log("" + keyword);
	if(keyword == 'senti mario') {
	quickStart("dimmi");
	}
});

//sonus.on('partial-result', result => console.log("Partial", result))

sonus.on('error', error => console.log('error', error))

sonus.on('final-result', result => {
  console.log("Final", result)
  fetch('https://api.dialogflow.com/v1/query?v=20150910&contexts=shop&lang=en&query='+result+'&sessionId=12345&timezone=Europe/Rome', {headers: {
      'Authorization': 'Bearer 3232e11bb950433a9953c53fd2289119'
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },})
.then(res => res.json())
.then(json => {
	quickStart(json.result.fulfillment.speech);
	sonus.trigger('ei mario');
});
  //quickStart(result);
  if (result.includes("stop")) {
    Sonus.stop()
  }
})
