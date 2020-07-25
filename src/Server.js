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
    constructor()
    {
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

        this.rooms = {};
    }

    listen(port)
    {
        this.server.listen(port)
    }

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
            // let expirationDate = new Date().getTime()/1000 + response.data.expires_in;
            res.writeHead(302, {
                'Location': this.options.loginRedirect,
                'Set-Cookie': ['id_token='+idToken]
              }
            );
            res.end();
          })
          .catch((error) => {
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