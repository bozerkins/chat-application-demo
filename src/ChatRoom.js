const WebSocket = require('ws');

module.exports = class ChatRoom {

    constructor(roomId, roomName)
    {
        this.wss = new WebSocket.Server({ noServer: true });
        this.wss.on('connection', (this.onConnection).bind(this));

        this.last = [];

        this.roomId = roomId;
        this.roomName = roomName;
    }
    
    onConnection(ws, request, user)
    {
        ws.user = user;

        // send last messages
        this.last.forEach(message => {
          ws.send(message);
        });

        // send chat room name
        ws.send(JSON.stringify({type: 'chat', payload: {id: this.roomId, name: this.roomName}}))

        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              // load the current user with list of clients
              ws.send(JSON.stringify({type: 'usr', payload: {sub: client.user.sub, name: client.user['cognito:username']}}));
              // notify others that we've joined the chatroom
              if (client !== ws) {
                client.send(JSON.stringify({type: 'usr', payload: {sub: ws.user.sub, name: ws.user['cognito:username']}}));
              }
          }
        });

        ws.on('close', () => {
          this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              // notify others that we've left the chatroom
              if (client !== ws) {
                client.send(JSON.stringify({type: 'out', payload: {sub: ws.user.sub}}));
              }
            }
          });
        });

        ws.on('message', (messageEncoded) => {
            let message = JSON.parse(messageEncoded);
            message.ts = new Date().getTime();
            message.author = user['cognito:username'];
            message.sub = user.sub;

            let broadcast = JSON.stringify({type: 'msg', payload: message});
            this.last.push(broadcast);
            this.last = this.last.splice(-15,15);
            this.wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                  client.send(broadcast);
              }
            });
        });
    }
}