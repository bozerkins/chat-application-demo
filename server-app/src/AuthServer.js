const url = require('url');
const http = require('http');
const axios = require('axios');
const qs = require('querystring');

module.exports = class AuthServer {
    constructor(options) 
    {
        this.options = options;
        this.pathnames = {
            '/login': this.login,
            '/callback': this.callback,
            '/logout': this.logout
        };
    }

    start(port)
    {
        console.log('Starting AuthServer at ' + port);
        this.createServer().listen(port);
    }

    createServer() 
    {
        return http.createServer(
            (req, res) => {
                let pathanme = url.parse(req.url, true).pathname;
                let callback = this.pathnames.hasOwnProperty(pathanme)
                    ? (this.pathnames[pathanme]).bind(this)
                    : (this.page404).bind(this);
                
                return callback(req, res);
            }
        );
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
      console.log(this);
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

    logout(req, res)
    {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end();
    }

    page404(req, res)
    {
        res.writeHead(404, {'Content-Type': 'text/html'});
        res.write('You page was not found');
        res.end();
    }
};