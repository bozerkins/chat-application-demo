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
    constructor(user)
    {
        this.user = user;
        this.autoscroll = true;
    }
    
    render()
    {
        $('#username').text(this.user['cognito:username']);
        $('#usernameControlDisplay').text('@' + this.user['cognito:username']);
        $('#logoutButton').click(() => {
            document.cookie = "id_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.reload();
        });
        
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

        $('.chat-message-container').scroll(function() {
            let atTheBottom = ($(this).prop("scrollHeight") - Math.floor($(this).scrollTop() + $(this).outerHeight())) === 0;
            if (atTheBottom === false) {
                this.autoscroll = false;
            } else {
                this.autoscroll = true;
            }
        });
    }

    renderMessage(message)
    {
        const name = `${message.author} (${message.sub})`;
        const isThisMe = message.sub ===  this.user.sub;

        const messageColor = isThisMe ? 'alert-info' : 'alert-secondary';
        const messageFloat = isThisMe ? 'float-right' : 'float-left';
        const authorFloat = isThisMe ? 'chat-author-me' : 'chat-author-not-me';
        const rendered = `
            <div class="chat-message w-100 p-1 clearfix">
                <span class="alert ${messageColor} ${messageFloat} m-0">
                    ${message.message}
                </span>
                <span class="chat-message-author ${authorFloat}">${name}</span>
            </div>
        `;
        $('.chat-message-container').first().append(rendered);
        
        // scroll to bottom
        if (this.autoscroll === true) {
            const container = $('.chat-message-container');
            container.scrollTop(container.prop("scrollHeight"));
        }
    }

    startControls(socket)
    {
        const input = $('#chat-message-input');
        input.focus();
        input.keyup(function(e) {
            if(e.keyCode == 13) // Enter
            {
                const message = input.val();
                if (!message) {
                    return;
                }
                socket.send(JSON.stringify({ message: message }));

                input.val('');
                // scroll to bottom
                const container = $('.chat-message-container');
                container.scrollTop(container.prop("scrollHeight"));
            }
        });
    }
}

(function() {
    // check authentication
    const user = getUser();
    if (user === null) {
        window.location.href = 'http://localhost:8001/login';
        return;
    }    

    //create the chat room
    let chatRoom = new ChatRoom(user);
    let overlay = new Overlay();
    let socket = new Socket("ws://localhost:8000/");
    socket.bindOpen((event) => {
        overlay.hide();
        chatRoom.render();
        chatRoom.startControls(socket);
    });
    socket.bindError((event) => {
        overlay.error();
        console.log(event);
    });
    socket.bindMessage((event) => {
        const message = JSON.parse(event.data);
        chatRoom.renderMessage(message);
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
})();