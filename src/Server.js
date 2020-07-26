const http = require('http');
const nodeStatic = require('node-static');
const url = require('url');
const axios = require('axios');
const qs = require('querystring');

const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const ChatRoom = require('./ChatRoom.js');
const { v4: uuidv4 } = require('uuid');

module.exports = class Server
{
    constructor(options)
    {
        this.options = options;

        this.jwk = axios.get(`https://cognito-idp.us-east-1.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`)
            .then((response) => response.data)
            .catch((error) => console.log(error));

        this.server = http.createServer((req, res) => {
            const request = url.parse(req.url, true);
            if (request.pathname.startsWith('/api/')) {
                // process api
                if (request.pathname === '/api/login') {
                    return this.login(req, res);
                }
                if (request.pathname === '/api/callback') {
                    return this.callback(req, res);
                }
                if (request.pathname === '/api/create') {
                    return this.create(req, res);
                }
                return this.page404(req, res);
            }
            if (request.pathname.startsWith('/chat/')) {
                // process websocket in upgrade event
                return;
            }

            // process static by default
            new nodeStatic.Server('./public').serve(req, res)
                .addListener('error', (err) => {
                    console.error("Error serving " + req.url + " - " + err.message);
                    this.page404(req, res);
                });
        });
        this.server.on('upgrade', (this.onUpgrade).bind(this));
        this.rooms = {};
    }

    listen(port)
    {
        this.server.listen(port)
    }

    onUpgrade(req, socket, head)
    {
        this.authenticate(req, (err, client) => {
            if (err || !client) {
                console.log(err, client);
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            const request = url.parse(req.url, true);
            if (request.pathname === '/chat/join') {
              let chatRoomId = request.query.id ? request.query.id : 'default';
              if (this.rooms.hasOwnProperty(chatRoomId) === false) {
                socket.destroy();
                return;
              }
              let chatRoom = this.rooms[chatRoomId];
              chatRoom.wss
                .handleUpgrade(req, socket, head, (ws) => {
                    chatRoom.wss.emit('connection', ws, req, client);
                });
            } else {
              socket.destroy();
            }
        });
    }

    authenticate(request, callback)
    {
      const idToken = parseCookie(request.headers.cookie, 'id_token');
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

    login(req, res)
    {
        const cognitoDomain = process.env.COGNITO_DOMAIN;
        const cognitoClientId = process.env.COGNITO_CLIENT_ID;
        const redirectUri = encodeURI(process.env.COGNITO_CALLBACK_URL);
        const loginUrl = `https://${cognitoDomain}/login?client_id=${cognitoClientId}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`;
    
        res.writeHead(302, { 'Location': loginUrl });
        res.end();
    }

    callback(req, res)
    {
        const request = url.parse(req.url, true);
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
          .then((response) => {
            let idToken = response.data.id_token;
            res.writeHead(302, {
                'Location': this.options.loginRedirect,
                'Set-Cookie': [createSetCookie({
                    name: 'id_token',
                    value: idToken,
                    path:'/'
                })]
              }
            );
            res.end();
          })
          .catch((error) => {
                res.writeHead(500, {'Content-Type': 'application/json',});
                res.write(JSON.stringify({
                    domain: cognitoDomain,
                    headers: headers,
                    params: params,
                    response: error
                }));
                res.end();
                console.log(error);
          });
    }

    create(req, res)
    {
        const request = url.parse(req.url, true);
        let chatRoomId = uuidv4();
        let chatRoomName = request.query.name ? request.query.name : 'default';
        this.rooms[chatRoomId] = new ChatRoom(chatRoomId, chatRoomName);
        res.writeHead(302, { 'Location': 'http://localhost:8080/chat.html?id='+chatRoomId });
        res.end();
    }

    page404(req, res)
    {
        res.writeHead(404, {'Content-Type': 'text/html'});
        res.write('You page was not found');
        res.end();
    }
}

function createSetCookie(options) {
    return (`${options.name || ''}=${options.value || ''}`)
        + (options.expires != null ? `; Expires=${options.expires.toUTCString()}` : '')
        + (options.maxAge != null ? `; Max-Age=${options.maxAge}` : '')
        + (options.domain != null ? `; Domain=${options.domain}` : '')
        + (options.path != null ? `; Path=${options.path}` : '')
        + (options.secure ? '; Secure' : '')
        + (options.httpOnly ? '; HttpOnly' : '')
        + (options.sameSite != null ? `; SameSite=${options.sameSite}` : '');
}
function parseCookie(cookie, cname) 
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