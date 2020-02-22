const { app, BrowserWindow } = require('electron')
const ipcMain = require('electron').ipcMain;
function createWindow () {
  // Crea la finestra del browser
  const win = new BrowserWindow({
    width: 450,
    height: 800,
    webPreferences: {
      nodeIntegration: true
    },
    resizable: false
  })

  // and load the index.html of the app.
  win.loadFile('index.html')

  // Apre il Pannello degli Strumenti di Sviluppo.
  win.webContents.openDevTools({mode: 'detach'})
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
var path = require('path');
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


function reset_keyword() {
    let rawdata = fs.readFileSync('./config/config.json');
    let config = JSON.parse(rawdata);
    config.hotwords = [];
    fs.writeFileSync('./config/config.json', JSON.stringify(config));
    var directory = './voice_models';

    fs.readdir(directory, (err, files) => {
      if (err) throw err;

      for (const file of files) {
        fs.unlink(path.join(directory, file), err => {
          if (err) throw err;
        });
      }
    });


    directory = './keyword_training';

    fs.readdir(directory, (err, files) => {
      if (err) throw err;

      for (const file of files) {
        fs.unlink(path.join(directory, file), err => {
          if (err) throw err;
        });
      }
    });

  }

 reset_keyword();

function reset_corpus() {
    let rawdata = fs.readFileSync('./nlp_corpuses/corpus.json');
    let config = JSON.parse(rawdata);
    config.data = [];
    fs.writeFileSync('./nlp_corpuses/corpus.json', JSON.stringify(config));
}

 reset_corpus();
const { dockStart } = require('@nlpjs/basic');

async function test(frase) {
  const dock = await dockStart({ use: ['Basic']});
  const nlp = dock.get('nlp');
  // Adds the utterances and intents for the NLP
  await nlp.addCorpus('./nlp_corpuses/corpus.json');
  await nlp.train();  // Train also the NLG

  const response = await nlp.process('it', frase);
  console.log(response);
  return(response);
};

//test('come va');

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


var sonus;

function load_sonus() {

let rawdata = fs.readFileSync('./config/config.json');
let config = JSON.parse(rawdata);
var hotwords = config.hotwords;
const language = 'it-IT';
console.log(hotwords);

if(hotwords != "" | undefined) {
sonus = Sonus.init({ hotwords, language, recordProgram: 'rec' }, client);
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

sonus.on('final-result', async (result) => {
  console.log("Final", result)
  let nlp_answer = await test(result);
	quickStart(nlp_answer.answer);
  
	//sonus.trigger('ei mario');

  //quickStart(result);
 /* if (result.includes("stop")) {
    Sonus.stop()
  } */
})
}
}



load_sonus();

const recorder = require('node-record-lpcm16');




ipcMain.on('start_recording', function(event, rec_number) {
  start_recording(rec_number);
})
ipcMain.on('stop_recording', function() {
  stop_recording();
})

var recording;

// Creates and starts the recording process.
function start_recording(rec_number) {
  console.log(rec_number)
  console.log('START');
  const file = fs.createWriteStream('./keyword_training/' + rec_number + '.wav', { encoding: 'binary' })
  recording = recorder.record({
  sampleRate: 44100
  })
  recording.stream()
  .pipe(file)
}
// Stops and removes the recording process.
function stop_recording() {
  console.log('STOP');
  recording.stop();
}

ipcMain.on('load_sonus', function() {
  load_sonus();
})

ipcMain.on('trigger_sonus', function(event, keyword) {
  sonus.trigger(keyword);
})
