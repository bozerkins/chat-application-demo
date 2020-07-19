require('dotenv').config({ path: __dirname + '/../.env' });
const http = require('http');
const WebSocket = require('ws');
const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

const axios = require('axios');
const jwkPromise = axios.get(`https://cognito-idp.us-east-1.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`)
  .then((response) => response.data)
  .catch((error) => console.log(error));
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

let messages = [{"id":0,"author":"Undefined","sub":"none","message":"Welcome to the Web Chat app","ts":1594580850602},{"message":"Hello!","ts":1595182130474,"id":1,"author":"bozerkins","sub":"f898d26c-6d78-44a9-9d6d-e875d26481b7"},{"message":"Hello to you too :)","ts":1595182236320,"id":2,"author":"bozerkins2","sub":"9311a4bd-f57b-411b-b6fc-2d07e7d2f6a2"},{"message":"Nice to see you :P","ts":1595182253293,"id":3,"author":"bozerkins","sub":"f898d26c-6d78-44a9-9d6d-e875d26481b7"},{"message":"You too :D","ts":1595182259397,"id":4,"author":"bozerkins2","sub":"9311a4bd-f57b-411b-b6fc-2d07e7d2f6a2"},{"message":"Test","ts":1595182275679,"id":5,"author":"bozerkins","sub":"f898d26c-6d78-44a9-9d6d-e875d26481b7"},{"message":"Message","ts":1595182277174,"id":6,"author":"bozerkins","sub":"f898d26c-6d78-44a9-9d6d-e875d26481b7"},{"message":"Please don't ","ts":1595182280258,"id":7,"author":"bozerkins","sub":"f898d26c-6d78-44a9-9d6d-e875d26481b7"},{"message":"Restart","ts":1595182281474,"id":8,"author":"bozerkins","sub":"f898d26c-6d78-44a9-9d6d-e875d26481b7"},{"message":"The server","ts":1595182283084,"id":9,"author":"bozerkins","sub":"f898d26c-6d78-44a9-9d6d-e875d26481b7"},{"message":"Please ","ts":1595182284330,"id":10,"author":"bozerkins","sub":"f898d26c-6d78-44a9-9d6d-e875d26481b7"},{"message":"Pretty please","ts":1595182286239,"id":11,"author":"bozerkins","sub":"f898d26c-6d78-44a9-9d6d-e875d26481b7"},{"message":"OKay okat","ts":1595182289082,"id":12,"author":"bozerkins2","sub":"9311a4bd-f57b-411b-b6fc-2d07e7d2f6a2"}];
let messageCounter = messages.length;

function getCookie(request, cname) 
{
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(request.headers.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
        c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
        }
    }
    return "";
}
function authenticate(request, callback)
{
  const idToken = getCookie(request, 'id_token');
  if (!idToken) {
    callback({error: "No valid token was provided"});
    return;
  }
  jwkPromise.then((jwk) => {
    jwt.verify(idToken, jwkToPem(jwk.keys[0]), { algorithms: ['RS256'] }, function(err, decodedToken) {
      if (err) {
        return callback({error: err});
      }
      // verify the claims
      if (decodedToken.exp <= (new Date().getTime() / 1000)) {
        return callback({error: "The token has expired"});
      }
      if (decodedToken.aud !== process.env.COGNITO_CLIENT_ID) {
        return callback({error: "Cognito Audience does not match"});
      }
      if (decodedToken.iss !== `https://cognito-idp.us-east-1.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`) {
        return callback({error: "Cognito Issuer does not match"});
      }
      if (decodedToken.token_use !== 'id') {
        return callback({error: "Invalid token use"});
      }
      // claims OK. finish the handshake
      callback(null, decodedToken);
    });
  });
};

wss.on('connection', function connection(ws, request, user) {
  // init
  let lineCounter = 0;
  let lines = [];
  let veryFirstMessageIndex = messages.length - 1;
  for(let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    lineCounter++;
    lines.push(message);

    let isFirstMessage = i === 0;
    if (isFirstMessage || lineCounter > 15) {
      ws.send(JSON.stringify({messages: lines}));
      ws.on('message', function (messageEncoded) {
          let message = JSON.parse(messageEncoded);
          message.ts = new Date().getTime();
          message.id = messageCounter++;
          message.author = user['cognito:username'];
          message.sub = user.sub;
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
server.on('upgrade', function upgrade(request, socket, head) {
  authenticate(request, (err, client) => {
    if (err || !client) {
      console.log(err, client);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request, client);
    });
  });
});
server.listen(8000);

const url = require('url');
const qs = require('querystring');

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