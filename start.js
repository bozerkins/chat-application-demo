require('dotenv').config({ path: __dirname + '/.env' });

const Server = require('./src/Server.js');
new Server({ loginRedirect: 'http://localhost:8080/' }).listen(8080);