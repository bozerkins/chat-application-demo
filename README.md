# chat-application-demo
A demo for Coding dummies stream &lt;3

# The structure

- Front-end app (for serving files to the client)
- Back-end app (for chat message exchange func.)

# Ports on dev
For frontend - localhost:8080
For backend websocket - localhost:8000

## Front-end app

Chat window
Message styling, distinguish messages between our user / other users
Typing prompt

For Frontend development to work, please install http-server (https://www.npmjs.com/package/http-server) and run it with 
```
npx http-server .
```

### Fron-end app JavaScript

Render messages
Write the messages in the UI
"Preserve history"

## Back-end app

Receive messages to the server
Send new messages to all the clients in the chat