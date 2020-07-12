const WebSocket = require('ws');
const lineReader = require('reverse-line-reader');
const wss = new WebSocket.Server({ port: 8000 });
let messages = [
  {"id": 0, "author": "Undefined", "message": "Welcome to the Web Chat app", "ts": 1594580850602},
];
let messageCounter = messages.length;

wss.on('connection', function connection(ws) {
  // init
  let lineCounter = 0;
  let lines = [];
  let veryFirstMessageIndex = messages.length - 1;
  for(let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    lineCounter++;
    lines.push(message);

    let isFirstMessage = i === 0;
    if (isFirstMessage || lineCounter > 10) {
      ws.send(JSON.stringify({messages: lines}));
      ws.on('message', function (messageEncoded) {
          let message = JSON.parse(messageEncoded);
          message.ts = new Date().getTime();
          message.id = messageCounter++;
          messages.push(message);
          console.log('Messages ' + JSON.stringify(messages));
      });
      
      let lastMessageIndex = veryFirstMessageIndex;
      function checkLastMessages() {
        console.log('Current last message ' + JSON.stringify(messages[lastMessageIndex]));
        if (messages[messages.length-1].id !== messages[lastMessageIndex].id) {
          // send last messages
          let pack = [];
          let lastMessagePackIndex = messages.length - 1;
          for(let j = lastMessageIndex + 1; j <= lastMessagePackIndex; j++) {
            pack.push(messages[j]);
          }
          lastMessageIndex = lastMessagePackIndex;
          ws.send(JSON.stringify({messages: pack}));
        }
        setTimeout(function() { checkLastMessages();}, 1000);
      }
      checkLastMessages();
      
      break;
    }
  }
});
