import { getUser } from './utils.js';

class Overlay
{
    constructor(retry, close) 
    {
        this.overlay = $('#chat-overlay');
    }

    loading()
    {
        this.overlay.children().hide();
        this.overlay.show();
        this.overlay.find('#loading-screen').show();
    }

    error()
    {
        this.overlay.children().hide();
        this.overlay.show();
        this.overlay.find('#error-screen').show();
    }

    hide()
    {
        this.overlay.hide();
    }

    bindRetry(onRetry) 
    {
        this.overlay.on('click', '#chat-retry', onRetry);
    }

    bindClose(onClose)
    {
        this.overlay.on('click', '#chat-close', onClose);
    }
}

class Socket
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

class ChatRoom
{
    constructor()
    {

    }
    
    render()
    {
        let user = getUser();
        $('#username').text(user['cognito:username']);
        $('#usernameControlDisplay').text('@' + user['cognito:username']);
        $('#logoutButton').click(() => {
            document.cookie = "id_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.reload();
        });
        
        createPicker();

        $('.chat-message-container').scroll(function() {
            let atTheBottom = ($(this).prop("scrollHeight") - Math.floor($(this).scrollTop() + $(this).outerHeight())) === 0;
            if (atTheBottom === false) {
                autoscroll = false;
            } else {
                autoscroll = true;
            }
        });
    }

    checkUserOrRedirect()
    {
        if (getUser() === null) {
            window.location.href = 'http://localhost:8001/login';
        }
    }
}


let autoscroll = true;
let chatRoom = new ChatRoom();
chatRoom.checkUserOrRedirect();

let overlay = new Overlay();
let socket = new Socket("ws://localhost:8000/");
socket.bindOpen((event) => {
    overlay.hide();
    chatRoom.render();
});
socket.bindError((event) => {
    overlay.error();
    console.log(event);
});
socket.bindMessage((event) => {
    const message = JSON.parse(event.data);
    message.me = message.sub ===  getUser().sub;

    renderMessage(`${message.author} (${message.sub})`, message.me, message.message)

    // scroll to bottom
    if (autoscroll === true) {
        const container = $('.chat-message-container');
        container.scrollTop(container.prop("scrollHeight"));
    }
});

overlay.bindRetry((event) => {
    overlay.loading();
    socket.connect();
});
overlay.bindClose((event) => {
    window.location.href = 'index.html';
});

overlay.loading();
socket.connect();

initControls(socket);

function renderMessage(name, isThisMe, message)
{
    const messageColor = isThisMe ? 'alert-info' : 'alert-secondary';
    const messageFloat = isThisMe ? 'float-right' : 'float-left';
    const authorFloat = isThisMe ? 'chat-author-me' : 'chat-author-not-me';
    const rendered = `
        <div class="chat-message w-100 p-1 clearfix">
            <span class="alert ${messageColor} ${messageFloat} m-0">
                ${message}
            </span>
            <span class="chat-message-author ${authorFloat}">${name}</span>
        </div>
    `;
    $('.chat-message-container').first().append(rendered);
}

function inputEnterEvent(input, server)
{
    const message = input.val();
    if (!message) {
        return;
    }
    server.send(JSON.stringify(
        { message: message }
    ));

    input.val('');
    // scroll to bottom
    const container = $('.chat-message-container');
    container.scrollTop(container.prop("scrollHeight"));
}

function initControls(server)
{
    const input = $('#chat-message-input');
    input.focus();
    input.keyup(function(e) {
        if(e.keyCode == 13) // Enter
        {
            inputEnterEvent(input, server);
        }
    });
}

function createPicker()
{
    const button = document.querySelector('#emoji-button');
    const picker = new EmojiButton({
        autoFocusSearch: false,
        showSearch: false,
        autoHide: false
    });
   
    picker.on('emoji', emoji => {
        const input = $('#chat-message-input');
        input.val(input.val() + emoji);
        input.focus();
    });
   
    button.addEventListener('click', () => {
      picker.togglePicker(button);
    });
}