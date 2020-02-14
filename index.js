const { app, BrowserWindow } = require('electron')

function createWindow () {
  // Crea la finestra del browser
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  win.loadFile('index.html')

  // Apre il Pannello degli Strumenti di Sviluppo.
  win.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Alcune API possono essere utilizzate solo dopo che si verifica questo evento.
app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // Su macOS è comune che l'applicazione e la barra menù 
  // restano attive finché l'utente non esce espressamente tramite i tasti Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // Su macOS è comune ri-creare la finestra dell'app quando
  // viene cliccata l'icona sul dock e non ci sono altre finestre aperte.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. Si può anche mettere il codice in file separati e richiederlo qui.



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
