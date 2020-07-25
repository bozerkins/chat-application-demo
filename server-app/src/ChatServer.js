const http = require('http');
const url = require('url');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const ChatRoom = require('./ChatRoom.js');
const { v4: uuidv4 } = require('uuid');

module.exports = class ChatServer {
    constructor()
    {
        this.jwk = axios.get(`https://cognito-idp.us-east-1.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`)
            .then((response) => response.data)
            .catch((error) => console.log(error));
    }

    start(port)
    {
        console.log('Starting ChatServer at ' + port);

        this.server = http.createServer((req, res) => {
          const requestDetails = url.parse(req.url, true);
          if (requestDetails.pathname === '/create') {
            let chatRoomId = uuidv4();
            let chatRoomName = requestDetails.query.name ? requestDetails.query.name : 'default';
            this.rooms[chatRoomId] = new ChatRoom(chatRoomId, chatRoomName);
            res.writeHead(302, { 'Location': 'http://localhost:8080/chat.html?id='+chatRoomId });
            res.end();
          } else {
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.write('You page was not found');
            res.end();
          }
        });
        this.server.on('upgrade', (this.onUpgrade).bind(this));
        this.server.listen(port)

        this.rooms = {};
    }

    onUpgrade(request, socket, head)
    {
        this.authenticate(request, (err, client) => {
            if (err || !client) {
                console.log(err, client);
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            const requestDetails = url.parse(request.url, true);
            if (requestDetails.pathname === '/join') {
              let chatRoomId = requestDetails.query.id ? requestDetails.query.id : 'default';
              if (this.rooms.hasOwnProperty(chatRoomId) === false) {
                socket.destroy();
                return;
              }
              let chatRoom = this.rooms[chatRoomId];
              chatRoom.wss
                .handleUpgrade(request, socket, head, (ws) => {
                    chatRoom.wss.emit('connection', ws, request, client);
                });
            } else {
              socket.destroy();
            }
        });
    }

    authenticate(request, callback)
    {
      const idToken = this.parseCookie(request.headers.cookie, 'id_token');
      if (!idToken) {
        callback({error: "No valid token was provided"});
        return;
      }

      this.jwk.then((jwk) => {
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

    parseCookie(cookie, cname) 
    {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(cookie);
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
};