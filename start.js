require('dotenv').config({ path: __dirname + '/.env' });

// const AuthServer = require('./src/AuthServer');
// const ChatServer = require('./src/ChatServer');

// new AuthServer({ loginRedirect: 'http://localhost:8080/' }).start(8001);;
// new ChatServer().start(8000);


const Server = require('./src/Server.js');
new Server().listen(8080);