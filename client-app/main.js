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
    $('.chat-message-cotnainer').first().append(rendered);
}

function inputEnterEvent(input, server)
{
    const message = input.val();
    if (!message) {
        return;
    }
    server.send(JSON.stringify(
        { message: message, me: true, author: getUsername() }
    )); 
    input.val('');
}

function initUsername()
{
    $('#username').text(getUsername());
    $('#usernameControlDisplay').text('@' + getUsername());
    $('#usernameInput').val(getUsername());
    $('#usernameSave').click(function() {
        const usernameError = $('#usernameError');
        const usernameInputValue = $('#usernameInput').val();
        if (!usernameInputValue) {
            usernameError.text('Username should not be empty');
            usernameError.show();
        } else {
            setUsername(usernameInputValue);
            usernameError.hide();
            $('#usernameModal').modal('hide');
            
            $('#username').text(getUsername());
            $('#usernameControlDisplay').text('@' + getUsername());
        }
    });
    if (hasUsername() === false) {
        $('#usernameModal').modal('show');
    }
}

function getUsername() {
    let username = window.localStorage.getItem('username');
    if (!username) {
        return 'Anonymous';
    }
    return username;
}

function hasUsername() {
    return getUsername() !== 'Anonymous';
}

function setUsername(username) {
    window.localStorage.setItem('username', username);
}

function clearUsername() {
    window.localStorage.clear();
}

function loadMessages()
{
    return $.get('./messages.json');
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

function init()
{
    initUsername();

    const server = new WebSocket("ws://localhost:8000/");
    let firstReceive = false;
    server.onmessage = function(event) {
        console.log(event.data);
        // parse the payload
        const payload = JSON.parse(event.data);
        const username = getUsername();
        let messages = payload.messages.map((message) => {
            message.me = message.author === username;
            return message;
        });
        // init message
        messages.sort(function(a, b) {
            return a.ts - b.ts;
        });
        messages.forEach((message) => {
            renderMessage(message.author, message.me, message.message)
        });
        if (firstReceive === false) {
            firstReceive = true;
            initControls(server);
        }
        console.log(payload);
    };
}

init();
