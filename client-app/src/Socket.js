export class Socket
{
    constructor(url)
    {
        this.url = url;
        this.onOpen = function() {};
        this.onMessage = function() {};
        this.onError = function() {};
        this.onClose = function() {};
    }

    send(message)
    {
        this.socket.send(message);
    }

    bindOpen(onOpen)
    {
        this.onOpen = onOpen;
    }

    bindMessage(onMessage)
    {
        this.onMessage = onMessage;
    }

    bindError(onError)
    {
        this.onError = onError;
    }

    bindClose(onClose)
    {
        this.onClose = onClose;
    }

    connect()
    {
        this.socket = new WebSocket(this.url);
        this.socket.addEventListener('open', this.onOpen);
        this.socket.addEventListener('message', this.onMessage);
        this.socket.addEventListener('error', this.onError);
        this.socket.addEventListener('close', this.onClose);
    }
}