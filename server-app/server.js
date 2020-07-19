const result = require('dotenv').config({ path: __dirname + '/../.env' });
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

const http = require('http');
const url = require('url');
const axios = require('axios');
const qs = require('querystring')

http.createServer(function (req, res) {
  let request = url.parse(req.url, true);

  // check the path
  if (request.pathname === '/login') {
    const cognitoDomain = process.env.COGNITO_DOMAIN;
    const cognitoClientId = process.env.COGNITO_CLIENT_ID;
    const redirectUri = encodeURI(process.env.COGNITO_CALLBACK_URL);
    const loginUrl = `https://${cognitoDomain}/login?client_id=${cognitoClientId}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`;

    res.writeHead(302, { 'Location': loginUrl });
    res.end();
  } else if (request.pathname === '/callback') {
    const cognitoDomain = `https://${process.env.COGNITO_DOMAIN}/oauth2/token`;
    const cognitoClientId = process.env.COGNITO_CLIENT_ID;
    const cognitoClientSecret = process.env.COGNITO_CLIENT_SECRET;
    const cognitoSecret = Buffer.from(cognitoClientId+':'+cognitoClientSecret).toString('base64');
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + cognitoSecret
    };
    const params = {
      grant_type: 'authorization_code',
      client_id: cognitoClientId,
      code: request.query.code,
      redirect_uri: encodeURI(process.env.COGNITO_CALLBACK_URL)
    };
    axios.post(cognitoDomain, qs.stringify(params), { headers: headers })
      .then(function (response) {
        let idToken = response.data.id_token;
        // let expirationDate = new Date().getTime()/1000 + response.data.expires_in;
        res.writeHead(302, {
            'Location': 'http://localhost:8080/',
            'Set-Cookie': ['id_token='+idToken]
          }
        );
        res.end();
      })
      .catch(function (error) {
        res.writeHead(500, {
            'Content-Type': 'application/json',
          }
        );
        res.write(JSON.stringify({
          domain: cognitoDomain,
          headers: headers,
          params: params,
          response: error
        }));
        res.end();
      });
    // .. check code
  } else if(request.pathname === '/logout') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end();
    // ... do logout
  } else {
    // 404
    res.writeHead(404, {'Content-Type': 'text/html'});
    res.write('You page was not found');
    res.end();
  }
  
}).listen(8001);